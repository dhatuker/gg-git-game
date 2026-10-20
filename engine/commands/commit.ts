import { msg, raw } from "../messages";
import { shortHash } from "../hash";
import { failure, getHeadCommitId, headSnapshot, inProgressBlock, success } from "../state";
import type { Commit, GitEvent, Handler, RepoState } from "../types";

function sameFiles(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

/** Membuat commit baru dari index dan memajukan HEAD. Dipakai juga oleh merge. */
export function createCommit(state: RepoState, message: string, parents: string[]): { state: RepoState; commit: Commit } {
  const snapshot = { ...state.index };
  // seq ikut di-hash agar commit dengan isi, pesan, dan parent sama tetap mendapat id berbeda.
  const seq = Object.values(state.commits).reduce((m, c) => Math.max(m, c.seq + 1), 0);
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
  const m = args.indexOf("-m");
  const message = m >= 0 ? args[m + 1] : undefined;
  if (!message || !message.trim()) {
    return failure(
      state,
      msg("commit.needMessage"),
      "Aborting commit due to empty commit message.",
    );
  }
  const headId = getHeadCommitId(state);
  const label = state.head.type === "branch" ? state.head.name : "detached HEAD";
  if (state.mergeState) {
    if (state.mergeState.conflicts.length > 0) {
      return failure(
        state,
        msg("commit.conflictsRemain", { files: state.mergeState.conflicts.join(", ") }),
        "error: Committing is not possible because you have unmerged files.",
      );
    }
    const parents = [headId as string, state.mergeState.fromCommit];
    const made = createCommit({ ...state, mergeState: null }, message, parents);
    const events: GitEvent[] = [
      { type: "commit-dibuat", id: made.commit.id, parents },
      { type: "merge-commit-dibuat", id: made.commit.id, parents: [parents[0], parents[1]] },
      { type: "konflik-selesai" },
    ];
    return success(made.state, [msg("commit.mergeDone"), raw(`[${label} ${made.commit.id}] ${message}`)], events);
  }
  if (sameFiles(state.index, headSnapshot(state))) {
    return failure(
      state,
      msg("commit.nothingStaged"),
      "nothing to commit, working tree clean",
    );
  }
  const parents = headId ? [headId] : [];
  const made = createCommit(state, message, parents);
  return success(made.state, [raw(`[${label} ${made.commit.id}] ${message}`)], [
    { type: "commit-dibuat", id: made.commit.id, parents },
  ]);
};
