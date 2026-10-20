import { msg, raw, type OutputLine } from "../messages";
import { connectedRemote, failure, inProgressBlock, success } from "../state";
import type { GitEvent, Handler, RepoState } from "../types";
import { copyMissing } from "./transfer";

export const NO_REPO_GIT = "fatal: 'origin' does not appear to be a git repository";

/** Unduh ujung `main` remote ke `origin/main`; null bila tidak ada yang baru. `key` memilih kalimat pesan. */
export function fetchMain(
  state: RepoState,
  remote: NonNullable<RepoState["remote"]>,
  key: "fetch.done" | "pull.fetched",
): { state: RepoState; output: OutputLine[]; events: GitEvent[] } | null {
  const tip = remote.branches.main;
  const current = state.remoteRefs.main;
  if (!tip || tip === current) return null;
  const next: RepoState = {
    ...state,
    commits: copyMissing(remote.commits, state.commits, tip),
    remoteRefs: { ...state.remoteRefs, main: tip },
  };
  return {
    state: next,
    output: [msg(key, { from: current ?? "", to: tip }), raw(`From ${remote.url}`), raw(`   ${current ?? "[new branch]"}..${tip}  main       -> origin/main`)],
    events: [{ type: "fetch-selesai", from: current ?? "", to: tip }],
  };
}

export const fetch: Handler = (state, args) => {
  const remote = connectedRemote(state);
  if (!remote) return failure(state, msg("remote.noRepo"), NO_REPO_GIT);
  const blocked = inProgressBlock(state);
  if (blocked) return blocked;
  if (args.some((a) => a.startsWith("-")) || args.length > 1 || (args.length === 1 && args[0] !== "origin")) {
    return failure(state, msg("fetch.badFlag"), "usage: git fetch [origin]");
  }
  const fetched = fetchMain(state, remote, "fetch.done");
  if (!fetched) return success(state, [msg("fetch.upToDate")]);
  return success(fetched.state, fetched.output, fetched.events);
};
