import { add } from "./commands/add";
import { branch } from "./commands/branch";
import { switchBranch } from "./commands/switch";
import { commit } from "./commands/commit";
import { log } from "./commands/log";
import { merge } from "./commands/merge";
import { init } from "./commands/init";
import { status } from "./commands/status";
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
      "Folder ini belum menjadi repositori git (bukan repositori git). Jalankan `git init` dulu.",
      "fatal: not a git repository (or any of the parent directories): .git",
    );
  }
  const handler = HANDLERS[parsed.name];
  if (!handler) {
    const suggestion = suggestCommand(parsed.name);
    const hint = suggestion ? ` Mungkin maksudmu \`git ${suggestion}\`?` : "";
    return failure(
      state,
      `Perintah \`git ${parsed.name}\` tidak dikenal di game ini.${hint}`,
      `git: '${parsed.name}' is not a git command. See 'git --help'.`,
    );
  }
  return handler(state, parsed.args);
}

export * from "./types";
export { createEmptyRepo, getHeadCommitId } from "./state";
