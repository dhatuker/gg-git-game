import { msg, raw, type MessageKey } from "../messages";
import { resolveRevision } from "../revision";
import {
  checkoutSnapshot,
  DIRTY_GIT,
  DIRTY_MESSAGE,
  failure,
  getHeadCommitId,
  hasUncommittedChanges,
  headSnapshot,
  inProgressBlock,
  success,
  untrackedFailure,
  untrackedOverwritten,
} from "../state";
import { threeWay } from "../threeway";
import type { Commit, CommandResult, Files, GitEvent, RepoState } from "../types";
import { createCommit } from "./commit";

export interface ReplaySpec {
  gitName: "revert" | "cherry-pick";
  keys: { needTarget: MessageKey; noCommits: MessageKey; isMerge: MessageKey; conflict: MessageKey; empty?: MessageKey; done: MessageKey };
  /** Susunan tiga arah dari commit target dan snapshot parent-nya. */
  sides: (target: Commit, parent: Files) => { base: Files; theirs: Files };
  message: (target: Commit) => string;
  event: (id: string, target: Commit) => GitEvent;
  doneParams: (id: string, target: Commit) => Record<string, string>;
}

function same(a: Files, b: Files): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

/** Terapkan perubahan satu commit ke HEAD sebagai commit baru (dasar revert dan cherry-pick). */
export function replayCommit(state: RepoState, args: string[], spec: ReplaySpec): CommandResult {
  const blocked = inProgressBlock(state);
  if (blocked) return blocked;
  if (args.length !== 1) {
    return failure(state, msg(spec.keys.needTarget), `fatal: ${spec.gitName}: expected exactly one revision`);
  }
  const headId = getHeadCommitId(state);
  if (!headId) {
    return failure(state, msg(spec.keys.noCommits), "fatal: your current branch does not have any commits yet");
  }
  if (hasUncommittedChanges(state)) return failure(state, DIRTY_MESSAGE, DIRTY_GIT);
  const resolved = resolveRevision(state, args[0]);
  if ("error" in resolved) return failure(state, resolved.error, resolved.git);

  const target = state.commits[resolved.id];
  if (target.parents.length > 1) {
    return failure(
      state,
      msg(spec.keys.isMerge),
      `error: commit ${target.id} is a merge but no -m option was given.\nfatal: ${spec.gitName} failed`,
    );
  }
  const parent = target.parents[0] ? state.commits[target.parents[0]].snapshot : {};
  const ours = headSnapshot(state);
  const { base, theirs } = spec.sides(target, parent);
  const { merged, conflictFiles, conflicts } = threeWay(base, ours, theirs, target.id);

  if (conflicts.length > 0) {
    return failure(
      state,
      msg(spec.keys.conflict, { files: conflicts.join(", ") }),
      `error: could not ${spec.gitName} ${target.id}\n${conflicts.map((c) => `CONFLICT (content): Merge conflict in ${c}`).join("\n")}`,
    );
  }
  if (spec.keys.empty && same(merged, ours)) {
    const git =
      spec.gitName === "revert"
        ? "nothing to commit, working tree clean"
        : "The previous cherry-pick is now empty, possibly due to conflict resolution.";
    return failure(state, msg(spec.keys.empty), git);
  }
  const clobbered = untrackedOverwritten(state, { ...merged, ...conflictFiles });
  if (clobbered.length) return untrackedFailure(state, clobbered, "merge");

  const prepared = { ...state, ...checkoutSnapshot(state, merged) };
  const made = createCommit(prepared, spec.message(target), [headId]);
  const id = made.commit.id;
  return success(
    made.state,
    [msg(spec.keys.done, spec.doneParams(id, target)), raw(`[${spec.gitName} ${id}] ${made.commit.message}`)],
    [{ type: "commit-dibuat", id, parents: [headId] }, spec.event(id, target)],
  );
}
