import type { RepoState } from "../engine/types";

export type SolutionStep =
  | { kind: "cmd"; input: string }
  | { kind: "write"; file: string; content: string }
  | { kind: "resolve"; file: string; choice: "ours" | "theirs" };

/** Teks yang dilihat pemain, dalam dua bahasa. */
export interface Localized {
  id: string;
  en: string;
}

export interface Level {
  id: number;
  title: Localized;
  story: Localized;
  goal: Localized;
  editor: boolean;
  allowedCommands: string[];
  initialState: RepoState;
  /** Tepat 3 petunjuk dari samar ke spesifik; tidak boleh memuat perintah solusi secara utuh. */
  hints: Localized[];
  isGoalReached: (s: RepoState) => boolean;
  /** Perintah yang harus pernah dijalankan dengan sukses di level ini (urutan bebas). */
  mustRun?: string[];
  solution: SolutionStep[];
}
