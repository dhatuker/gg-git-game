import { msg, raw } from "../messages";
import {
  DIRTY_MESSAGE,
  failure,
  getHeadCommitId,
  hasUncommittedChanges,
  isReachable,
  success,
  untrackedFailure,
  untrackedOverwritten,
} from "../state";
import type { Files, Handler, RepoState } from "../types";
import { createCommit } from "./commit";
import { reachableCommits } from "./log";

function mergeBase(state: RepoState, a: string, b: string): string | null {
  const fromB = new Set(reachableCommits(state, b).map((c) => c.id));
  const common = reachableCommits(state, a).find((c) => fromB.has(c.id));
  return common ? common.id : null;
}

function withUntracked(state: RepoState, snapshot: Files): Files {
  const files: Files = {};
  for (const [p, c] of Object.entries(state.files)) if (!(p in state.index)) files[p] = c;
  return { ...files, ...snapshot };
}

export const merge: Handler = (state, args) => {
  const target = args[0];
  if (!target) return failure(state, msg("merge.needTarget"), "fatal: No commit specified and merge.defaultToUpstream not set.");
  if (state.mergeState) {
    return failure(
      state,
      msg("merge.inProgress"),
      "fatal: You have not concluded your merge (MERGE_HEAD exists).",
    );
  }
  if (!(target in state.branches)) {
    return failure(state, msg("merge.notFound", { branch: target }), `merge: ${target} - not something we can merge`);
  }
  const ours = getHeadCommitId(state);
  if (!ours) return failure(state, msg("merge.noCommits"), "fatal: your current branch does not have any commits yet");
  const theirs = state.branches[target];
  if (isReachable(state, ours, theirs)) {
    return success(state, [msg("merge.upToDate", { branch: target }), raw("Already up to date.")]);
  }
  if (hasUncommittedChanges(state)) {
    return failure(state, DIRTY_MESSAGE, "error: Your local changes would be overwritten by merge.\nPlease commit your changes or stash them before you merge.");
  }
  const branchLabel = state.head.type === "branch" ? state.head.name : "HEAD";

  if (isReachable(state, theirs, ours)) {
    const snapshot = state.commits[theirs].snapshot;
    const clobbered = untrackedOverwritten(state, snapshot);
    if (clobbered.length) return untrackedFailure(state, clobbered, "merge");
    const moved: RepoState =
      state.head.type === "branch"
        ? { ...state, branches: { ...state.branches, [state.head.name]: theirs } }
        : { ...state, head: { type: "detached", id: theirs } };
    return success(
      { ...moved, files: withUntracked(state, snapshot), index: { ...snapshot } },
      [msg("merge.fastForward", { branch: branchLabel, to: theirs }), raw(`Updating ${ours}..${theirs}`), raw("Fast-forward")],
      [{ type: "merge-fast-forward", branch: branchLabel, to: theirs }],
    );
  }

  const baseId = mergeBase(state, ours, theirs);
  const b = baseId ? state.commits[baseId].snapshot : {};
  const o = state.commits[ours].snapshot;
  const t = state.commits[theirs].snapshot;
  const merged: Files = {};
  const conflictFiles: Files = {};
  const conflicts: string[] = [];
  for (const p of [...new Set([...Object.keys(b), ...Object.keys(o), ...Object.keys(t)])].sort()) {
    let value: string | undefined;
    if (o[p] === t[p]) value = o[p];
    else if (b[p] === o[p]) value = t[p];
    else if (b[p] === t[p]) value = o[p];
    else {
      conflicts.push(p);
      conflictFiles[p] = `<<<<<<< HEAD\n${o[p] ?? ""}\n=======\n${t[p] ?? ""}\n>>>>>>> ${target}`;
      if (o[p] !== undefined) merged[p] = o[p];
      continue;
    }
    if (value !== undefined) merged[p] = value;
  }

  const clobbered = untrackedOverwritten(state, { ...merged, ...conflictFiles });
  if (clobbered.length) return untrackedFailure(state, clobbered, "merge");

  if (conflicts.length > 0) {
    const files = { ...withUntracked(state, merged), ...conflictFiles };
    return success(
      { ...state, files, index: merged, mergeState: { from: target, fromCommit: theirs, conflicts } },
      [
        msg("merge.conflict", { files: conflicts.join(", ") }),
        msg("merge.conflictNext"),
        ...conflicts.map((c) => raw(`CONFLICT (content): Merge conflict in ${c}`)),
        raw("Automatic merge failed; fix conflicts and then commit the result."),
      ],
      [{ type: "konflik-terjadi", files: conflicts }],
    );
  }

  const prepared = { ...state, files: withUntracked(state, merged), index: merged };
  const message = `Merge branch '${target}'`;
  const made = createCommit(prepared, message, [ours, theirs]);
  return success(made.state, [msg("merge.commitCreated", { id: made.commit.id }), raw("Merge made by the 'ort' strategy.")], [
    { type: "commit-dibuat", id: made.commit.id, parents: [ours, theirs] },
    { type: "merge-commit-dibuat", id: made.commit.id, parents: [ours, theirs] },
  ]);
};
