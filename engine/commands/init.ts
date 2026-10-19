import { msg, raw } from "../messages";
import { failure, success } from "../state";
import type { Handler } from "../types";

export const init: Handler = (state) => {
  if (state.initialized) {
    return failure(state, msg("init.already"), "Reinitialized existing Git repository");
  }
  return success(
    { ...state, initialized: true, head: { type: "branch", name: "main" } },
    [msg("init.done"), raw("Initialized empty Git repository in .git/")],
    [{ type: "repo-dibuat" }],
  );
};
