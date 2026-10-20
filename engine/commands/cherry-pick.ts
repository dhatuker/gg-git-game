import type { Handler } from "../types";
import { replayCommit } from "./replay";

/** git cherry-pick <rev> */
export const cherryPick: Handler = (state, args) =>
  replayCommit(state, args, {
    gitName: "cherry-pick",
    keys: {
      needTarget: "cherryPick.needTarget",
      noCommits: "cherryPick.noCommits",
      isMerge: "cherryPick.isMerge",
      conflict: "cherryPick.conflict",
      empty: "cherryPick.empty",
      done: "cherryPick.done",
    },
    sides: (target, parent) => ({ base: parent, theirs: target.snapshot }),
    message: (target) => target.message,
    event: (id, target) => ({ type: "cherry-pick-dibuat", id, source: target.id }),
    doneParams: (id, target) => ({ id, source: target.id }),
  });
