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
    default:
      return none;
  }
}
