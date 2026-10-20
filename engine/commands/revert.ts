import type { Handler } from "../types";
import { replayCommit } from "./replay";

/** git revert <rev> */
export const revert: Handler = (state, args) =>
  replayCommit(state, args, {
    gitName: "revert",
    keys: {
      needTarget: "revert.needTarget",
      noCommits: "revert.noCommits",
      isMerge: "revert.isMerge",
      conflict: "revert.conflict",
      empty: "revert.empty",
      done: "revert.done",
    },
    sides: (target, parent) => ({ base: target.snapshot, theirs: parent }),
    message: (target) => `Revert "${target.message}"`,
    event: (id, target) => ({ type: "revert-dibuat", id, reverted: target.id }),
    doneParams: (id, target) => ({ id, reverted: target.id }),
  });
