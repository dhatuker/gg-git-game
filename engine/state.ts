import { msg, raw, type Msg, type OutputLine } from "./messages";
import type { CommandResult, Files, GitEvent, RepoState } from "./types";

export function createEmptyRepo(files: Files = {}): RepoState {
  return {
    initialized: false,
    files: { ...files },
    index: {},
    commits: {},
    branches: {},
    head: { type: "branch", name: "main" },
    mergeState: null,
  };
}

export function getHeadCommitId(state: RepoState): string | null {
  if (state.head.type === "detached") return state.head.id;
  return state.branches[state.head.name] ?? null;
}

export function headSnapshot(state: RepoState): Files {
  const id = getHeadCommitId(state);
  return id ? state.commits[id].snapshot : {};
}

export function success(state: RepoState, output: OutputLine[], events: GitEvent[] = []): CommandResult {
  return { state, output, events, ok: true };
}

/** Teks mentah multi-baris menjadi baris-baris raw. */
export function rawLines(text: string): OutputLine[] {
  return text.split("\n").map(raw);
}

/** Pesan ramah (berkunci) di baris pertama, pesan asli git (raw) di bawahnya. */
export function failure(state: RepoState, message: Msg, gitMessage?: string): CommandResult {
  return { state, output: gitMessage ? [message, ...rawLines(gitMessage)] : [message], events: [], ok: false };
}

/** True bila targetId dapat dicapai dari fromId lewat rantai parent (termasuk dirinya sendiri). */
export function isReachable(state: RepoState, fromId: string, targetId: string): boolean {
  const seen = new Set<string>();
  const stack = [fromId];
  while (stack.length) {
    const cur = stack.pop() as string;
    if (cur === targetId) return true;
    if (seen.has(cur) || !state.commits[cur]) continue;
    seen.add(cur);
    stack.push(...state.commits[cur].parents);
  }
  return false;
}

/** Ada perubahan pada file terlacak yang belum di-commit (di staging atau working directory). */
export function hasUncommittedChanges(state: RepoState): boolean {
  const head = headSnapshot(state);
  const keys = new Set([...Object.keys(head), ...Object.keys(state.index)]);
  for (const k of keys) if (head[k] !== state.index[k]) return true;
  return Object.keys(state.index).some((p) => state.files[p] !== state.index[p]);
}

/** Ganti working directory + index ke snapshot, pertahankan file tak terlacak. */
export function checkoutSnapshot(state: RepoState, snapshot: Files): Pick<RepoState, "files" | "index"> {
  const files: Files = {};
  for (const [p, c] of Object.entries(state.files)) if (!(p in state.index)) files[p] = c;
  return { files: { ...files, ...snapshot }, index: { ...snapshot } };
}

/** File tak terlacak yang isinya akan ditimpa bila working directory diganti `snapshot`. */
export function untrackedOverwritten(state: RepoState, snapshot: Files): string[] {
  return Object.keys(state.files)
    .filter((p) => !(p in state.index) && p in snapshot && snapshot[p] !== state.files[p])
    .sort();
}

export function untrackedFailure(state: RepoState, paths: string[], action: "switch" | "merge"): CommandResult {
  return failure(
    state,
    msg(action === "merge" ? "untracked.merge" : "untracked.switch", { files: paths.join(", ") }),
    `error: The following untracked working tree files would be overwritten by ${action === "merge" ? "merge" : "checkout"}:\n${paths.map((p) => `\t${p}`).join("\n")}`,
  );
}

export const BRANCH_NAME = /^[A-Za-z0-9._/-]+$/;

export function isValidBranchName(name: string): boolean {
  return BRANCH_NAME.test(name) && !name.startsWith("-");
}

export const DIRTY_MESSAGE: Msg = msg("state.dirty");
export const DIRTY_GIT = "error: Your local changes would be overwritten.\nPlease commit your changes or stash them before you switch branches.";
