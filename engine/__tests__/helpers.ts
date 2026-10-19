import { runCommand } from "../index";
import { createEmptyRepo } from "../state";
import { writeFile } from "../files";
import type { CommandResult, Files, RepoState } from "../types";

export function initRepo(files: Files = {}): RepoState {
  return runCommand(createEmptyRepo(files), "git init").state;
}

/** Jalankan perintah dan pastikan sukses; kembalikan state. */
export function run(state: RepoState, input: string): RepoState {
  const r = runCommand(state, input);
  if (!r.ok) throw new Error(`Perintah gagal: ${input}\n${r.output}`);
  return r.state;
}

export function write(state: RepoState, name: string, content: string): RepoState {
  const r = writeFile(state, name, content);
  if (r.error) throw new Error(r.error);
  return r.state;
}

export function exec(state: RepoState, input: string): CommandResult {
  return runCommand(state, input);
}
