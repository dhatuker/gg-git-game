import { add } from "./commands/add";
import { branch } from "./commands/branch";
import { switchBranch } from "./commands/switch";
import { commit } from "./commands/commit";
import { diff } from "./commands/diff";
import { restore } from "./commands/restore";
import { log } from "./commands/log";
import { merge } from "./commands/merge";
import { init } from "./commands/init";
import { status } from "./commands/status";
import { reset } from "./commands/reset";
import { revert } from "./commands/revert";
import { cherryPick } from "./commands/cherry-pick";
import { stash } from "./commands/stash";
import { rebase } from "./commands/rebase";
import { clone } from "./commands/clone";
import { remote } from "./commands/remote";
import { fetch } from "./commands/fetch";
import { push } from "./commands/push";
import { pull } from "./commands/pull";
import { checkFlags } from "./flags";
import { msg } from "./messages";
import { hasOwn } from "./own";
import { parseInput } from "./parse";
import { failure } from "./state";
import { suggestCommand } from "./suggest";
import type { CommandResult, Handler, RepoState } from "./types";

export const HANDLERS: Record<string, Handler> = {
  init,
  status,
  add,
  commit,
  log,
  diff,
  restore,
  branch,
  switch: switchBranch,
  checkout: switchBranch,
  merge,
  reset,
  revert,
  "cherry-pick": cherryPick,
  stash,
  rebase,
  clone,
  remote,
  fetch,
  push,
  pull,
};

export function runCommand(state: RepoState, input: string): CommandResult {
  const parsed = parseInput(input);
  if ("error" in parsed) return failure(state, parsed.error);
  if (!state.initialized && parsed.name !== "init" && parsed.name !== "clone") {
    return failure(
      state,
      msg("repo.notInitialized"),
      "fatal: not a git repository (or any of the parent directories): .git",
    );
  }
  const handler = hasOwn(HANDLERS, parsed.name) ? HANDLERS[parsed.name] : undefined;
  if (!handler) {
    const suggestion = suggestCommand(parsed.name);
    return failure(
      state,
      suggestion && suggestion !== parsed.name ? msg("command.unknownSuggest", { cmd: parsed.name, suggestion }) : msg("command.unknown", { cmd: parsed.name }),
      `git: '${parsed.name}' is not a git command. See 'git --help'.`,
    );
  }
  const checked = checkFlags(parsed.name, parsed.args);
  if ("error" in checked) return failure(state, checked.error);
  return handler(state, checked.args);
}

export * from "./types";
export * from "./messages";
export { createEmptyRepo, getHeadCommitId } from "./state";
export { COMMAND_FLAGS } from "./flags";
export { hasOwn } from "./own";
