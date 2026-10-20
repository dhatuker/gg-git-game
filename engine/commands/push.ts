import { msg, raw } from "../messages";
import { connectedRemote, failure, getHeadCommitId, inProgressBlock, isReachable, success } from "../state";
import type { Handler } from "../types";
import { NO_REPO_GIT } from "./fetch";
import { copyMissing, countMissing } from "./transfer";

export const push: Handler = (state, args) => {
  const remote = connectedRemote(state);
  if (!remote) return failure(state, msg("remote.noRepo"), NO_REPO_GIT);
  const blocked = inProgressBlock(state);
  if (blocked) return blocked;
  if (args.some((a) => a.startsWith("-"))) {
    return failure(state, msg("push.badFlag"), "usage: git push [origin [main]]");
  }
  const okArgs = args.length === 0 || (args[0] === "origin" && (args.length === 1 || (args.length === 2 && args[1] === "main")));
  if (!okArgs) return failure(state, msg("push.onlyMain"), "error: src refspec does not match any");
  const localTip = state.branches.main;
  const headId = getHeadCommitId(state);
  if (!headId) return failure(state, msg("push.noCommits"), "error: src refspec main does not match any");
  if (state.head.type !== "branch" || state.head.name !== "main" || !localTip) {
    return failure(state, msg("push.onlyMain"), "error: src refspec does not match any");
  }
  const remoteTip = remote.branches.main;
  if (remoteTip === localTip) return success(state, [msg("push.upToDate"), raw("Everything up-to-date")]);
  if (remoteTip) {
    const rejectedRaw = (why: string) => `! [rejected] main -> main (${why})`;
    if (!state.commits[remoteTip]) {
      return failure(state, msg("push.rejected", { reason: "fetch-first" }), rejectedRaw("fetch first"));
    }
    if (!isReachable(state, localTip, remoteTip)) {
      return failure(state, msg("push.rejected", { reason: "non-fast-forward" }), rejectedRaw("non-fast-forward"));
    }
  }
  const count = countMissing(state.commits, remote.commits, localTip);
  return success(
    {
      ...state,
      remote: {
        ...remote,
        commits: copyMissing(state.commits, remote.commits, localTip),
        branches: { ...remote.branches, main: localTip },
      },
      remoteRefs: { ...state.remoteRefs, main: localTip },
    },
    [msg("push.done", { count, to: localTip }), raw(`To ${remote.url}`), raw(`   ${remoteTip ?? "[new branch]"}..${localTip}  main -> main`)],
    [{ type: "push-berhasil", from: remoteTip ?? "", to: localTip, count }],
  );
};
