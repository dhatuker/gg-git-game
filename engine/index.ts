import { add } from "./commands/add";
import { branch } from "./commands/branch";
import { switchBranch } from "./commands/switch";
import { commit } from "./commands/commit";
import { log } from "./commands/log";
import { merge } from "./commands/merge";
import { init } from "./commands/init";
import { status } from "./commands/status";
import { msg } from "./messages";
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
  branch,
  switch: switchBranch,
  checkout: switchBranch,
  merge,
};

export function runCommand(state: RepoState, input: string): CommandResult {
  const parsed = parseInput(input);
  if ("error" in parsed) return failure(state, parsed.error);
  if (!state.initialized && parsed.name !== "init") {
    return failure(
      state,
      msg("repo.notInitialized"),
      "fatal: not a git repository (or any of the parent directories): .git",
    );
  }
  const handler = HANDLERS[parsed.name];
  if (!handler) {
    const suggestion = suggestCommand(parsed.name);
    return failure(
      state,
      suggestion ? msg("command.unknownSuggest", { cmd: parsed.name, suggestion }) : msg("command.unknown", { cmd: parsed.name }),
      `git: '${parsed.name}' is not a git command. See 'git --help'.`,
    );
  }
  return handler(state, parsed.args);
}

export * from "./types";
export * from "./messages";
export { createEmptyRepo, getHeadCommitId } from "./state";
