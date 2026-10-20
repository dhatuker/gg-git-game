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

export interface StashEntry {
  files: Files;
  index: Files;
  baseCommit: string | null;
}

export interface RebaseState {
  branch: string;
  onto: string;
  originalTip: string;
  current: string | null;
  remaining: string[];
  conflicts: string[];
}

export interface RemoteState {
  url: string;
  connected: boolean;
  branches: Record<string, string>;
  commits: Record<string, Commit>;
}

export interface RepoState {
  initialized: boolean;
  files: Files;
  index: Files;
  commits: Record<string, Commit>;
  branches: Record<string, string>;
  head: Head;
  mergeState: MergeState | null;
  stash: StashEntry[];
  rebaseState: RebaseState | null;
  remote: RemoteState | null;
  remoteRefs: Record<string, string>;
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
  | { type: "konflik-selesai" }
  | { type: "reset-dilakukan"; mode: "soft" | "mixed" | "hard"; from: string; to: string }
  | { type: "revert-dibuat"; id: string; reverted: string }
  | { type: "cherry-pick-dibuat"; id: string; source: string }
  | { type: "stash-disimpan"; files: string[] }
  | { type: "stash-dipulihkan"; files: string[] }
  | { type: "rebase-commit-disalin"; from: string; to: string }
  | { type: "rebase-selesai"; branch: string; tip: string }
  | { type: "rebase-dibatalkan"; branch: string };

export interface CommandResult {
  state: RepoState;
  /** Pesan berkunci (diterjemahkan UI) dan baris mentah (pesan asli git, log, nama file). */
  output: OutputLine[];
  events: GitEvent[];
  ok: boolean;
}

export type Handler = (state: RepoState, args: string[]) => CommandResult;
