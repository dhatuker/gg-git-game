import type { RepoState } from "../engine/types";

export type SolutionStep =
  | { kind: "cmd"; input: string }
  | { kind: "write"; file: string; content: string }
  | { kind: "resolve"; file: string; choice: "ours" | "theirs" };

export interface ButtonSpec {
  label: string;
  command: string;
}

export interface Level {
  id: number;
  title: string;
  story: string;
  goal: string;
  mode: "buttons" | "terminal" | "hybrid";
  editor: boolean;
  allowedCommands: string[];
  buttons: ButtonSpec[];
  initialState: RepoState;
  hints: string[];
  isGoalReached: (s: RepoState) => boolean;
  /** Perintah yang harus pernah dijalankan dengan sukses di level ini (urutan bebas). */
  mustRun?: string[];
  solution: SolutionStep[];
}
