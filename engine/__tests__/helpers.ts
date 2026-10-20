import { runCommand } from "../index";
import { createEmptyRepo } from "../state";
import { writeFile } from "../files";
import type { MessageKey } from "../messages";
import { shortHash } from "../hash";
import type { Commit, CommandResult, Files, RepoState } from "../types";

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

/** Hubungkan remote berisi salinan commit lokal; main dan origin/main = ujung main lokal. */
export function attachRemote(state: RepoState, url = "https://github.com/gg-team/taskboard.git"): RepoState {
  const tip = state.branches.main;
  return {
    ...state,
    remote: { url, connected: true, branches: tip ? { main: tip } : {}, commits: { ...state.commits } },
    remoteRefs: tip ? { main: tip } : {},
  };
}

/** Teman menambah satu commit di ujung main remote saja (state lokal tak tersentuh). */
export function teammateCommit(state: RepoState, file: string, content: string, message: string): RepoState {
  const remote = state.remote;
  if (!remote) throw new Error("teammateCommit: remote belum terpasang");
  const tipId = remote.branches.main;
  const parents = tipId ? [tipId] : [];
  const snapshot = { ...(tipId ? remote.commits[tipId].snapshot : {}), [file]: content };
  const seq = [...Object.values(state.commits), ...Object.values(remote.commits)].reduce((m, c) => Math.max(m, c.seq + 1), 0);
  const id = shortHash(JSON.stringify({ parents, message, snapshot, seq }));
  const commit: Commit = { id, seq, parents, message, snapshot };
  return {
    ...state,
    remote: { ...remote, commits: { ...remote.commits, [id]: commit }, branches: { ...remote.branches, main: id } },
  };
}
