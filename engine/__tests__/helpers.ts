import { runCommand } from "../index";
import { createEmptyRepo } from "../state";
import { writeFile } from "../files";
import type { MessageKey } from "../messages";
import type { CommandResult, Files, RepoState } from "../types";

export function initRepo(files: Files = {}): RepoState {
  return runCommand(createEmptyRepo(files), "git init").state;
}

/** Jalankan perintah dan pastikan sukses; kembalikan state. */
export function run(state: RepoState, input: string): RepoState {
  const r = runCommand(state, input);
  if (!r.ok) throw new Error(`Perintah gagal: ${input}\n${JSON.stringify(r.output)}`);
  return r.state;
}

export function write(state: RepoState, name: string, content: string): RepoState {
  const r = writeFile(state, name, content);
  if (r.error) throw new Error(r.error.key);
  return r.state;
}

export function exec(state: RepoState, input: string): CommandResult {
  return runCommand(state, input);
}

/** Kunci pesan (yang diterjemahkan) dalam output, berurutan. */
export function keys(r: CommandResult): MessageKey[] {
  return r.output.flatMap((l) => ("key" in l ? [l.key] : []));
}

/** Baris mentah (pesan asli git, nama file, log) digabung dengan baris baru. */
export function rawText(r: CommandResult): string {
  return r.output.flatMap((l) => ("raw" in l ? [l.raw] : [])).join("\n");
}

/** Parameter pesan pertama dengan kunci tertentu. */
export function paramsOf(r: CommandResult, key: MessageKey): Record<string, string | number> | undefined {
  const m = r.output.find((l) => "key" in l && l.key === key);
  return m && "key" in m ? m.params : undefined;
}
