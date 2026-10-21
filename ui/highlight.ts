import type { GitEvent } from "../engine/types";

/** Commit, label, dan file yang perlu disorot untuk satu event. */
export function highlightTargets(e: GitEvent | null, branches: Record<string, string>): {
  commits: string[];
  labels: string[];
  files: string[];
} {
  const none = { commits: [], labels: [], files: [] };
  if (!e) return none;
  switch (e.type) {
    case "commit-dibuat":
      return { commits: [e.id], labels: ["HEAD"], files: [] };
    case "merge-commit-dibuat":
      return { commits: [e.id], labels: [], files: [] };
    case "branch-dibuat":
      return { commits: [e.at], labels: [e.name], files: [] };
    case "branch-pindah":
      return { commits: branches[e.to] ? [branches[e.to]] : [], labels: ["HEAD"], files: [] };
    case "head-pindah":
      return { commits: [e.id], labels: ["HEAD"], files: [] };
    case "merge-fast-forward":
      return { commits: [e.to], labels: [e.branch], files: [] };
    case "file-di-stage":
      return { commits: [], labels: [], files: [e.file] };
    case "konflik-terjadi":
      return { commits: [], labels: [], files: e.files };
    case "reset-dilakukan":
      return { commits: [e.to], labels: ["HEAD"], files: [] };
    case "revert-dibuat":
    case "cherry-pick-dibuat":
      return { commits: [e.id], labels: [], files: [] };
    case "stash-disimpan":
    case "stash-dipulihkan":
      return { commits: [], labels: [], files: e.files };
    case "rebase-commit-disalin":
      return { commits: [e.to], labels: [], files: [] };
    case "rebase-selesai":
      return { commits: [e.tip], labels: [e.branch], files: [] };
    case "push-berhasil":
      return { commits: [e.to], labels: ["origin/main"], files: [] };
    case "fetch-selesai":
      return { commits: [e.to], labels: [], files: [] };
    case "restore-dilakukan":
      return { commits: [], labels: [], files: e.files };
    case "commit-diperbaiki":
      return { commits: [e.to], labels: ["HEAD"], files: [] };
    default:
      return none;
  }
}

export type AreaColumn = "working" | "staging" | "stash" | "remote" | "repo";

/** Kolom area yang disorot untuk satu event: tempat perubahan "tiba", atau dua area yang dibandingkan `git diff`. */
export function litColumns(e: GitEvent | null): AreaColumn[] {
  switch (e?.type) {
    case "file-di-stage":
      return ["staging"];
    case "konflik-terjadi":
    case "stash-dipulihkan":
      return ["working"];
    case "stash-disimpan":
      return ["stash"];
    case "reset-dilakukan":
      return e.mode === "soft" ? ["staging"] : e.mode === "mixed" ? ["working"] : [];
    case "push-berhasil":
      return ["remote"];
    case "fetch-selesai":
    case "clone-selesai":
      return ["repo"];
    case "diff-ditampilkan":
      return e.staged ? ["staging", "repo"] : ["working", "staging"];
    case "restore-dilakukan":
      return [e.staged ? "staging" : "working"];
    default:
      return [];
  }
}
