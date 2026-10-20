import { msg, raw } from "../messages";
import { failure, success } from "../state";
import type { Handler } from "../types";

const stripGit = (url: string) => url.replace(/\.git$/, "");

export const clone: Handler = (state, args) => {
  if (state.initialized) {
    return failure(state, msg("clone.alreadyInit"), "fatal: destination path '.' already exists and is not an empty directory.");
  }
  if (args.length === 0) {
    return failure(state, msg("clone.needUrl"), "fatal: You must specify a repository to clone.");
  }
  if (args.length > 1 || args[0].startsWith("-")) {
    return failure(state, msg("clone.badArgs"), "usage: git clone <url>");
  }
  const url = args[0];
  const remote = state.remote;
  if (!remote || stripGit(remote.url) !== stripGit(url)) {
    return failure(state, msg("clone.notFound", { url }), `fatal: repository '${url}' not found`);
  }
  const tip = remote.branches.main;
  const snapshot = tip ? remote.commits[tip].snapshot : {};
  return success(
    {
      ...state,
      initialized: true,
      files: { ...snapshot },
      index: { ...snapshot },
      commits: { ...remote.commits },
      branches: tip ? { main: tip } : {},
      remoteRefs: tip ? { main: tip } : {},
      head: { type: "branch", name: "main" },
      remote: { ...remote, connected: true },
    },
    [msg("clone.done", { url }), raw(`Cloning into '.'...`)],
    [{ type: "clone-selesai", tip: tip ?? "" }],
  );
};
