import { msg, raw } from "../messages";
import { connectedRemote, failure, inProgressBlock, success } from "../state";
import type { Handler } from "../types";
import { copyMissing } from "./transfer";

export const NO_REPO_GIT = "fatal: 'origin' does not appear to be a git repository";

export const fetch: Handler = (state, args) => {
  const remote = connectedRemote(state);
  if (!remote) return failure(state, msg("remote.noRepo"), NO_REPO_GIT);
  const blocked = inProgressBlock(state);
  if (blocked) return blocked;
  if (args.some((a) => a.startsWith("-")) || args.length > 1 || (args.length === 1 && args[0] !== "origin")) {
    return failure(state, msg("fetch.badFlag"), "usage: git fetch [origin]");
  }
  const tip = remote.branches.main;
  const current = state.remoteRefs.main;
  if (!tip || tip === current) return success(state, [msg("fetch.upToDate")]);
  const next = {
    ...state,
    commits: copyMissing(remote.commits, state.commits, tip),
    remoteRefs: { ...state.remoteRefs, main: tip },
  };
  return success(
    next,
    [msg("fetch.done", { from: current ?? "", to: tip }), raw(`From ${remote.url}`), raw(`   ${current ?? "[new branch]"}..${tip}  main       -> origin/main`)],
    [{ type: "fetch-selesai", from: current ?? "", to: tip }],
  );
};
