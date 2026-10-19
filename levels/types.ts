import type { RepoState } from "../engine/types";

export type SolutionStep =
  | { kind: "cmd"; input: string }
  | { kind: "write"; file: string; content: string }
  | { kind: "resolve"; file: string; choice: "ours" | "theirs" };

export interface Level {
  id: number;
  title: string;
  story: string;
  goal: string;
  editor: boolean;
  allowedCommands: string[];
  initialState: RepoState;
  /** Tepat 3 petunjuk dari samar ke spesifik; tidak boleh memuat perintah solusi secara utuh. */
  hints: string[];
  isGoalReached: (s: RepoState) => boolean;
  /** Perintah yang harus pernah dijalankan dengan sukses di level ini (urutan bebas). */
  mustRun?: string[];
  solution: SolutionStep[];
}
