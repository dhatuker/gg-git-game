import { msg, raw } from "../messages";
import { connectedRemote, failure, getHeadCommitId, inProgressBlock } from "../state";
import type { Handler, RepoState } from "../types";
import { NO_REPO_GIT } from "./fetch";
import { mergeCommit } from "./merge";
import { copyMissing } from "./transfer";

export const pull: Handler = (state, args) => {
  const remote = connectedRemote(state);
  if (!remote) return failure(state, msg("remote.noRepo"), NO_REPO_GIT);
  const blocked = inProgressBlock(state);
  if (blocked) return blocked;
  if (args.some((a) => a.startsWith("-"))) {
    return failure(state, msg("pull.badFlag"), "usage: git pull [origin [main]]");
  }
  const okArgs = args.length === 0 || (args[0] === "origin" && (args.length === 1 || (args.length === 2 && args[1] === "main")));
  if (!okArgs) {
    const ref = args[0] === "origin" ? args[1] : args[0];
    return failure(state, msg("pull.onlyMain"), `fatal: couldn't find remote ref ${ref}`);
  }
  if (!getHeadCommitId(state)) {
    return failure(state, msg("pull.noCommits"), "fatal: You are not currently on a branch.");
  }
  if (state.head.type !== "branch" || state.head.name !== "main") {
    return failure(state, msg("pull.onlyMain"), "fatal: no tracking information for the current branch.");
  }
  const tip = remote.branches.main;
  if (!tip) return failure(state, msg("pull.onlyMain"), "fatal: couldn't find remote ref main");

  const current = state.remoteRefs.main;
  let fetched: RepoState = state;
  const output = [];
  const events = [];
  if (tip !== current) {
    fetched = {
      ...state,
      commits: copyMissing(remote.commits, state.commits, tip),
      remoteRefs: { ...state.remoteRefs, main: tip },
    };
    output.push(msg("fetch.done", { from: current ?? "", to: tip }), raw(`From ${remote.url}`), raw(`   ${current ?? "[new branch]"}..${tip}  main       -> origin/main`));
    events.push({ type: "fetch-selesai" as const, from: current ?? "", to: tip });
  }
  const merged = mergeCommit(fetched, tip, "origin/main", `Merge branch 'main' of ${remote.url}`);
  if (!merged.ok) return { ...merged, state };
  return { ...merged, output: [...output, ...merged.output], events: [...events, ...merged.events] };
};
