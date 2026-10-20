import { msg, raw, type Msg, type OutputLine } from "./messages";
import type { CommandResult, Files, GitEvent, RemoteState, RepoState } from "./types";

export function createEmptyRepo(files: Files = {}): RepoState {
  return {
    initialized: false,
    files: { ...files },
    index: {},
    commits: {},
    branches: {},
    head: { type: "branch", name: "main" },
    mergeState: null,
    stash: [],
    rebaseState: null,
    remote: null,
    remoteRefs: {},
  };
}

/** Remote yang sudah terhubung (setelah clone); null bila belum ada atau belum terhubung. */
export function connectedRemote(state: RepoState): RemoteState | null {
  return state.remote?.connected ? state.remote : null;
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

/** Daftar file konflik dari merge atau rebase yang sedang berjalan. */
export function activeConflicts(state: RepoState): string[] {
  if (state.mergeState) return state.mergeState.conflicts;
  if (state.rebaseState) return state.rebaseState.conflicts;
  return [];
}

/** Commit sumber versi `ours` (HEAD) dan `theirs` untuk konflik aktif; null bila tak ada konflik. */
export function conflictSources(state: RepoState): { ours: string; theirs: string } | null {
  const ours = getHeadCommitId(state) as string;
  if (state.mergeState) return { ours, theirs: state.mergeState.fromCommit };
  if (state.rebaseState && state.rebaseState.current) return { ours, theirs: state.rebaseState.current };
  return null;
}

/** Buang `paths` dari daftar konflik state aktif. `remaining` null bila tak ada state konflik. */
export function markResolved(
  state: RepoState,
  paths: string[],
): { state: RepoState; resolved: string[]; remaining: string[] | null } {
  if (state.mergeState) {
    const resolved = state.mergeState.conflicts.filter((c) => paths.includes(c));
    const remaining = state.mergeState.conflicts.filter((c) => !paths.includes(c));
    return { state: { ...state, mergeState: { ...state.mergeState, conflicts: remaining } }, resolved, remaining };
  }
  if (state.rebaseState) {
    const resolved = state.rebaseState.conflicts.filter((c) => paths.includes(c));
    const remaining = state.rebaseState.conflicts.filter((c) => !paths.includes(c));
    return { state: { ...state, rebaseState: { ...state.rebaseState, conflicts: remaining } }, resolved, remaining };
  }
  return { state, resolved: [], remaining: null };
}

/** Id commit yang tak terjangkau dari branch, HEAD, atau state merge/rebase; urut seq menurun. */
export function unreachableCommits(state: RepoState): string[] {
  const roots = [...Object.values(state.branches), ...Object.values(state.remoteRefs ?? {})];
  const head = getHeadCommitId(state);
  if (head) roots.push(head);
  if (state.mergeState) roots.push(state.mergeState.fromCommit);
  if (state.rebaseState) {
    roots.push(state.rebaseState.originalTip);
    if (state.rebaseState.current) roots.push(state.rebaseState.current);
  }
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const cur = stack.pop() as string;
    if (seen.has(cur) || !state.commits[cur]) continue;
    seen.add(cur);
    stack.push(...state.commits[cur].parents);
  }
  return Object.values(state.commits)
    .filter((c) => !seen.has(c.id))
    .sort((a, b) => b.seq - a.seq)
    .map((c) => c.id);
}

/** Gagal bila rebase atau merge sedang berjalan; null bila bersih. */
export function inProgressBlock(state: RepoState): CommandResult | null {
  if (state.rebaseState) {
    return failure(state, msg("rebase.inProgress"), "fatal: It seems that there is already a rebase-merge directory");
  }
  if (state.mergeState) {
    return failure(state, msg("merge.inProgress"), "fatal: You have not concluded your merge (MERGE_HEAD exists).");
  }
  return null;
}
