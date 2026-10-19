import type { OutputLine } from "./messages";

export type Files = Record<string, string>;

export interface Commit {
  id: string;
  seq: number;
  parents: string[];
  message: string;
  snapshot: Files;
}

export type Head = { type: "branch"; name: string } | { type: "detached"; id: string };

export interface MergeState {
  from: string;
  fromCommit: string;
  conflicts: string[];
}

export interface RepoState {
  initialized: boolean;
  files: Files;
  index: Files;
  commits: Record<string, Commit>;
  branches: Record<string, string>;
  head: Head;
  mergeState: MergeState | null;
}

export type GitEvent =
  | { type: "repo-dibuat" }
  | { type: "file-di-stage"; file: string }
  | { type: "commit-dibuat"; id: string; parents: string[] }
  | { type: "branch-dibuat"; name: string; at: string }
  | { type: "branch-dihapus"; name: string }
  | { type: "branch-pindah"; from: string; to: string }
  | { type: "head-pindah"; id: string }
  | { type: "merge-fast-forward"; branch: string; to: string }
  | { type: "merge-commit-dibuat"; id: string; parents: [string, string] }
  | { type: "konflik-terjadi"; files: string[] }
  | { type: "konflik-selesai" };

export interface CommandResult {
  state: RepoState;
  /** Pesan berkunci (diterjemahkan UI) dan baris mentah (pesan asli git, log, nama file). */
  output: OutputLine[];
  events: GitEvent[];
  ok: boolean;
}

export type Handler = (state: RepoState, args: string[]) => CommandResult;
