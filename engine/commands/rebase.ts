import { msg, raw, type OutputLine } from "../messages";
import {
  checkoutSnapshot,
  DIRTY_GIT,
  DIRTY_MESSAGE,
  failure,
  getHeadCommitId,
  hasUncommittedChanges,
  headSnapshot,
  inProgressBlock,
  isReachable,
  success,
  untrackedFailure,
  untrackedOverwritten,
} from "../state";
import { resolveRef } from "../revision";
import { threeWay } from "../threeway";
import type { CommandResult, GitEvent, Handler, RebaseState, RepoState } from "../types";
import { createCommit } from "./commit";
import { reachableCommits } from "./log";

/** Commit yang terjangkau dari `tip` tapi tidak dari `onto`, urut seq menaik. */
function commitsBetween(state: RepoState, onto: string, tip: string) {
  const fromOnto = new Set(reachableCommits(state, onto).map((c) => c.id));
  return reachableCommits(state, tip)
    .filter((c) => !fromOnto.has(c.id))
    .reverse();
}

/**
 * Lanjutkan penyalinan commit dari `state.rebaseState.remaining` ke atas HEAD (detached).
 * Berhenti di konflik pertama; bila sisa habis, pindahkan branch ke hasil dan tempelkan HEAD lagi.
 * Dipakai oleh `git rebase <branch>` dan `git rebase --continue` (yang mengosongkan `current` dulu).
 */
export function replay(state: RepoState): CommandResult {
  if (!state.rebaseState) return success(state, []);
  let cur = state;
  const events: GitEvent[] = [];
  const pending = [...state.rebaseState.remaining];

  while (pending.length) {
    const id = pending.shift() as string;
    const original = cur.commits[id];
    const base = original.parents[0] ? cur.commits[original.parents[0]].snapshot : {};
    const { merged, conflictFiles, conflicts } = threeWay(base, headSnapshot(cur), original.snapshot, original.message);

    if (conflicts.length > 0) {
      const files = { ...checkoutSnapshot(cur, merged).files, ...conflictFiles };
      const rebaseState = { ...(cur.rebaseState as RebaseState), current: id, remaining: pending, conflicts };
      return success(
        { ...cur, files, index: merged, rebaseState },
        [
          msg("rebase.conflict", { files: conflicts.join(", "), id }),
          msg("rebase.conflictNext"),
          ...conflicts.map((c) => raw(`CONFLICT (content): Merge conflict in ${c}`)),
        ],
        [...events, { type: "konflik-terjadi", files: conflicts }],
      );
    }

    const made = createCommit({ ...cur, ...checkoutSnapshot(cur, merged) }, original.message, [getHeadCommitId(cur) as string]);
    cur = made.state;
    events.push({ type: "rebase-commit-disalin", from: id, to: made.commit.id });
  }

  const { branch, onto } = state.rebaseState;
  const tip = getHeadCommitId(cur) as string;
  const done: RepoState = {
    ...cur,
    branches: { ...cur.branches, [branch]: tip },
    head: { type: "branch", name: branch },
    rebaseState: null,
  };
  const count = commitsBetween(done, onto, tip).length;
  const output: OutputLine[] = [msg("rebase.done", { branch, count }), raw(`Successfully rebased and updated refs/heads/${branch}.`)];
  return success(done, output, [...events, { type: "rebase-selesai", branch, tip }]);
}

function notInProgress(state: RepoState): CommandResult {
  return failure(state, msg("rebase.notInProgress"), "fatal: No rebase in progress?");
}

/** `git rebase --continue`: commit hasil penyelesaian konflik sebagai salinan `current`, lalu lanjutkan replay. */
function continueRebase(state: RepoState): CommandResult {
  const rs = state.rebaseState;
  if (!rs) return notInProgress(state);
  if (rs.conflicts.length > 0) {
    return failure(
      state,
      msg("rebase.continueConflictsRemain", { files: rs.conflicts.join(", ") }),
      "error: Committing is not possible because you have unmerged files.",
    );
  }
  // Replay menimpa setiap file terlacak; jangan diam-diam membuang suntingan yang belum di-add.
  const unstaged = Object.keys(state.index)
    .filter((p) => state.files[p] !== state.index[p])
    .sort();
  if (unstaged.length > 0) {
    return failure(state, msg("rebase.continueUnstaged", { files: unstaged.join(", ") }), "error: cannot rebase: You have unstaged changes.");
  }
  let cur = state;
  const events: GitEvent[] = [];
  if (rs.current) {
    const made = createCommit(state, state.commits[rs.current].message, [getHeadCommitId(state) as string]);
    cur = made.state;
    events.push({ type: "rebase-commit-disalin", from: rs.current, to: made.commit.id });
  }
  const result = replay({ ...cur, rebaseState: { ...rs, current: null } });
  return { ...result, events: [...events, ...result.events] };
}

/** `git rebase --abort`: kembalikan HEAD dan file ke ujung semula; salinan yang sudah dibuat tetap ada. */
function abortRebase(state: RepoState): CommandResult {
  const rs = state.rebaseState;
  if (!rs) return notInProgress(state);
  return success(
    {
      ...state,
      ...checkoutSnapshot(state, state.commits[rs.originalTip].snapshot),
      head: { type: "branch", name: rs.branch },
      rebaseState: null,
    },
    [msg("rebase.aborted", { branch: rs.branch })],
    [{ type: "rebase-dibatalkan", branch: rs.branch }],
  );
}

export const rebase: Handler = (state, args) => {
  const target = args[0];
  if (target === "--continue") return continueRebase(state);
  if (target === "--abort") return abortRebase(state);
  const blocked = inProgressBlock(state);
  if (blocked) return blocked;
  if (!target) return failure(state, msg("rebase.needTarget"), "fatal: no upstream configured for the current branch");
  const onto = resolveRef(state, target);
  if (!onto) {
    return failure(state, msg("rebase.notFound", { branch: target }), `fatal: invalid upstream '${target}'`);
  }
  if (state.head.type !== "branch") {
    return failure(state, msg("rebase.notOnBranch"), "fatal: HEAD is detached; switch to a branch before rebasing");
  }
  const branch = state.head.name;
  if (branch === target) {
    return failure(state, msg("rebase.sameBranch"), `Current branch ${branch} is up to date.`);
  }
  if (hasUncommittedChanges(state)) return failure(state, DIRTY_MESSAGE, DIRTY_GIT);

  const tip = getHeadCommitId(state) as string;
  if (isReachable(state, tip, onto)) {
    return success(state, [msg("rebase.upToDate", { branch: target }), raw(`Current branch ${branch} is up to date.`)]);
  }
  const range = commitsBetween(state, onto, tip);
  if (range.some((c) => c.parents.length > 1)) {
    return failure(state, msg("rebase.hasMerges"), "error: this game cannot rebase merge commits");
  }
  // Periksa di depan agar tak perlu menolak di tengah penyalinan.
  const snapshots = [state.commits[onto].snapshot, ...range.map((c) => c.snapshot)];
  const clobbered = [...new Set(snapshots.flatMap((snap) => untrackedOverwritten(state, snap)))].sort();
  if (clobbered.length) return untrackedFailure(state, clobbered, "switch");
  if (isReachable(state, onto, tip)) {
    return success(
      { ...state, branches: { ...state.branches, [branch]: onto }, ...checkoutSnapshot(state, state.commits[onto].snapshot) },
      [msg("rebase.fastForward", { branch, to: onto }), raw(`Successfully rebased and updated refs/heads/${branch}.`)],
      [{ type: "rebase-selesai", branch, tip: onto }],
    );
  }

  return replay({
    ...state,
    ...checkoutSnapshot(state, state.commits[onto].snapshot),
    head: { type: "detached", id: onto },
    rebaseState: { branch, onto, originalTip: tip, current: null, remaining: range.map((c) => c.id), conflicts: [] },
  });
};
