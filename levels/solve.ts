import { runCommand } from "../engine";
import { resolveConflict, writeFile } from "../engine/files";
import { createEmptyRepo, getHeadCommitId, headSnapshot } from "../engine/state";
import type { Files, RepoState } from "../engine/types";
import type { SolutionStep } from "./types";

/** Menjalankan langkah berurutan; melempar Error bila ada langkah yang gagal. */
export function applySteps(state: RepoState, steps: SolutionStep[]): RepoState {
  let s = state;
  for (const step of steps) {
    if (step.kind === "cmd") {
      const r = runCommand(s, step.input);
      if (!r.ok) throw new Error(`Langkah gagal: ${step.input}\n${JSON.stringify(r.output)}`);
      s = r.state;
    } else {
      const r = step.kind === "write" ? writeFile(s, step.file, step.content) : resolveConflict(s, step.file, step.choice);
      if (r.error) throw new Error(r.error.key);
      s = r.state;
    }
  }
  return s;
}

/** Membangun state awal level dari file awal dan langkah persiapan. */
export function setup(files: Files, steps: SolutionStep[] = []): RepoState {
  return applySteps(createEmptyRepo(files), steps);
}

export const cmd = (input: string): SolutionStep => ({ kind: "cmd", input });
export const write = (file: string, content: string): SolutionStep => ({ kind: "write", file, content });

export function headParents(s: RepoState): number {
  const id = getHeadCommitId(s);
  return id ? s.commits[id].parents.length : 0;
}

export const commitCount = (s: RepoState): number => Object.keys(s.commits).length;

/** Id commit pertama (menurut urutan buat) yang berpesan `message`. Hanya untuk membangun level. */
export function idByMessage(state: RepoState, message: string): string {
  const found = Object.values(state.commits)
    .sort((a, b) => a.seq - b.seq)
    .find((c) => c.message === message);
  if (!found) throw new Error(`Commit tidak ditemukan: ${message}`);
  return found.id;
}

const sameFiles = (a: Files, b: Files): boolean => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => k in b && a[k] === b[k]);
};

/** Working directory dan index sama persis dengan snapshot HEAD. */
export function treeMatchesHead(s: RepoState): boolean {
  const snap = headSnapshot(s);
  return sameFiles(s.files, snap) && sameFiles(s.index, snap);
}
