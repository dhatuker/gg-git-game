import { msg, raw } from "../messages";
import { shortHash } from "../hash";
import { failure, getHeadCommitId, headSnapshot, inProgressBlock, success, unreachableCommits } from "../state";
import { flagValue, hasFlag } from "../flags";
import type { CommandResult, Commit, GitEvent, Handler, RepoState } from "../types";

function sameFiles(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

/** Membuat commit baru dari index dan memajukan HEAD. Dipakai juga oleh merge. */
export function createCommit(state: RepoState, message: string, parents: string[]): { state: RepoState; commit: Commit } {
  const snapshot = { ...state.index };
  // seq ikut di-hash agar commit dengan isi, pesan, dan parent sama tetap mendapat id berbeda.
  const seq = [...Object.values(state.commits), ...Object.values(state.remote?.commits ?? {})].reduce((m, c) => Math.max(m, c.seq + 1), 0);
  const id = shortHash(JSON.stringify({ parents, message, snapshot, seq }));
  const commit: Commit = { id, seq, parents, message, snapshot };
  const commits = { ...state.commits, [id]: commit };
  const next: RepoState =
    state.head.type === "branch"
      ? { ...state, commits, branches: { ...state.branches, [state.head.name]: id } }
      : { ...state, commits, head: { type: "detached", id } };
  return { state: next, commit };
}

export const commit: Handler = (state, args) => {
  // Saat rebase, salinan commit dibuat oleh `git rebase --continue`, bukan `git commit`.
  const blocked = state.rebaseState && inProgressBlock(state);
  if (blocked) return blocked;
  if (hasFlag(args, "--amend", ["-m"])) return amend(state, args);
  const message = flagValue(args, "-m", ["-m"]);
  if (!message || !message.trim()) {
    return failure(
      state,
      msg("commit.needMessage"),
      "Aborting commit due to empty commit message.",
    );
  }
  const unresolved = (state.mergeState?.conflicts.length ?? 0) > 0;
  // `-a` men-stage perubahan file yang sudah terlacak dulu (file baru tetap tidak ikut), kecuali saat konflik belum selesai.
  const staged = hasFlag(args, "-a", ["-m"]) && !unresolved ? stageTracked(state) : { state, events: [] };
  return commitStaged(state, staged.state, message, staged.events);
};

/** Perubahan file terlacak di working directory dipindah ke index, seperti `git commit -a`. */
function stageTracked(state: RepoState): { state: RepoState; events: GitEvent[] } {
  const index = { ...state.index };
  const events: GitEvent[] = [];
  for (const p of Object.keys(index).sort()) {
    if (p in state.files && state.files[p] !== index[p]) {
      index[p] = state.files[p];
      events.push({ type: "file-di-stage", file: p });
    }
  }
  return { state: { ...state, index }, events };
}

/** Commit isi index `state`; kegagalan selalu mengembalikan `original` (sebelum `-a` men-stage apa pun). */
function commitStaged(original: RepoState, state: RepoState, message: string, stagedEvents: GitEvent[]): CommandResult {
  const headId = getHeadCommitId(state);
  const label = state.head.type === "branch" ? state.head.name : "detached HEAD";
  if (state.mergeState) {
    if (state.mergeState.conflicts.length > 0) {
      return failure(
        original,
        msg("commit.conflictsRemain", { files: state.mergeState.conflicts.join(", ") }),
        "error: Committing is not possible because you have unmerged files.",
      );
    }
    const parents = [headId as string, state.mergeState.fromCommit];
    const made = createCommit({ ...state, mergeState: null }, message, parents);
    const events: GitEvent[] = [
      ...stagedEvents,
      { type: "commit-dibuat", id: made.commit.id, parents },
      { type: "merge-commit-dibuat", id: made.commit.id, parents: [parents[0], parents[1]] },
      { type: "konflik-selesai" },
    ];
    return success(made.state, [msg("commit.mergeDone"), raw(`[${label} ${made.commit.id}] ${message}`)], events);
  }
  if (sameFiles(state.index, headSnapshot(state))) {
    return failure(
      original,
      msg("commit.nothingStaged"),
      "nothing to commit, working tree clean",
    );
  }
  const parents = headId ? [headId] : [];
  const made = createCommit(state, message, parents);
  return success(made.state, [raw(`[${label} ${made.commit.id}] ${message}`)], [
    ...stagedEvents,
    { type: "commit-dibuat", id: made.commit.id, parents },
  ]);
}

/**
 * `git commit --amend`: ganti commit HEAD dengan commit baru (parent sama, isi dari staging).
 * Commit lama tidak dihapus; ia jadi yatim kecuali masih ditunjuk ref lain (misalnya origin/main).
 */
function amend(state: RepoState, args: string[]): CommandResult {
  const blocked = inProgressBlock(state);
  if (blocked) return blocked;
  const headId = getHeadCommitId(state);
  if (!headId) return failure(state, msg("commit.amendNothing"), "fatal: You have nothing to amend.");
  const old = state.commits[headId];
  const message = hasFlag(args, "--no-edit", ["-m"]) && !hasFlag(args, "-m", ["-m"]) ? old.message : flagValue(args, "-m", ["-m"]);
  if (!message || !message.trim()) return failure(state, msg("commit.amendNeedsMessage"));
  const staged = hasFlag(args, "-a", ["-m"]) ? stageTracked(state) : { state, events: [] };
  const made = createCommit(staged.state, message, old.parents);
  const label = state.head.type === "branch" ? state.head.name : "detached HEAD";
  const orphaned = unreachableCommits(made.state).includes(headId);
  return success(
    made.state,
    [
      msg(orphaned ? "commit.amended" : "commit.amendedStillReferenced", { from: headId, to: made.commit.id }),
      raw(`[${label} ${made.commit.id}] ${message}`),
    ],
    [...staged.events, { type: "commit-diperbaiki", from: headId, to: made.commit.id, orphaned }],
  );
}
