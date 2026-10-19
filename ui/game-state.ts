import { HANDLERS, runCommand } from "../engine";
import { resolveConflict, writeFile, type EditResult } from "../engine/files";
import { parseInput } from "../engine/parse";
import type { GitEvent, RepoState } from "../engine/types";
import { LEVELS } from "../levels";
import { describeEvents } from "./caption";

export interface TerminalLine {
  kind: "input" | "output" | "error";
  text: string;
}

export interface GameState {
  levelIndex: number;
  repo: RepoState;
  completed: number[];
  ran: string[];
  failedAttempts: number;
  lines: TerminalLine[];
  events: GitEvent[];
  caption: string;
  levelComplete: boolean;
}

export type GameAction =
  | { type: "run"; input: string }
  | { type: "write"; file: string; content: string }
  | { type: "resolve"; file: string; choice: "ours" | "theirs" }
  | { type: "reset-level" }
  | { type: "goto-level"; index: number }
  | { type: "load-progress"; completed: number[] };

export const NOT_ALLOWED = "Perintah ini belum dipakai di level ini.";
export const READ_ONLY_CAPTION = "Perintah ini hanya menampilkan informasi. Repositori tidak berubah.";

export function isUnlocked(completed: number[], index: number): boolean {
  if (index === 0) return true;
  const prev = LEVELS[index - 1];
  return prev !== undefined && completed.includes(prev.id);
}

function startLevel(index: number, completed: number[]): GameState {
  return {
    levelIndex: index,
    repo: LEVELS[index].initialState,
    completed,
    ran: [],
    failedAttempts: 0,
    lines: [],
    events: [],
    caption: "",
    levelComplete: false,
  };
}

export function initGame(completed: number[]): GameState {
  const first = LEVELS.findIndex((l) => !completed.includes(l.id));
  return startLevel(first === -1 ? LEVELS.length - 1 : first, completed);
}

function withGoalCheck(state: GameState): GameState {
  const level = LEVELS[state.levelIndex];
  const done = level.isGoalReached(state.repo) && (level.mustRun ?? []).every((c) => state.ran.includes(c));
  // Sekali selesai, tetap selesai sampai level diulang atau ditinggalkan: pemain boleh bereksperimen.
  if (!done) return state;
  const completed = state.completed.includes(level.id) ? state.completed : [...state.completed, level.id];
  return { ...state, completed, levelComplete: true };
}

function applyEdit(state: GameState, result: EditResult): GameState {
  if (result.error) {
    return { ...state, lines: [...state.lines, { kind: "error", text: result.error }] };
  }
  return withGoalCheck({ ...state, repo: result.state });
}

function runInput(state: GameState, input: string): GameState {
  const level = LEVELS[state.levelIndex];
  const lines: TerminalLine[] = [...state.lines, { kind: "input", text: input }];
  const parsed = parseInput(input);
  // Hanya perintah yang dikenal engine yang bisa "terkunci"; typo diteruskan ke engine agar mendapat saran.
  if (!("error" in parsed) && parsed.name in HANDLERS && !level.allowedCommands.includes(parsed.name)) {
    return { ...state, lines: [...lines, { kind: "error", text: NOT_ALLOWED }], failedAttempts: state.failedAttempts + 1 };
  }
  const r = runCommand(state.repo, input);
  const next: GameState = {
    ...state,
    repo: r.state,
    lines: [...lines, { kind: r.ok ? "output" : "error", text: r.output }],
    failedAttempts: r.ok ? state.failedAttempts : state.failedAttempts + 1,
    ran: r.ok && !("error" in parsed) && !state.ran.includes(parsed.name) ? [...state.ran, parsed.name] : state.ran,
    events: r.events,
    caption: r.ok ? describeEvents(r.events) || READ_ONLY_CAPTION : state.caption,
  };
  return withGoalCheck(next);
}

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "run":
      return runInput(state, action.input);
    case "write":
      return applyEdit(state, writeFile(state.repo, action.file, action.content));
    case "resolve":
      return applyEdit(state, resolveConflict(state.repo, action.file, action.choice));
    case "reset-level":
      return startLevel(state.levelIndex, state.completed);
    case "goto-level":
      if (action.index < 0 || action.index >= LEVELS.length || !isUnlocked(state.completed, action.index)) return state;
      return startLevel(action.index, state.completed);
    case "load-progress":
      return initGame(action.completed);
  }
}

/** Petunjuk bertingkat: satu petunjuk terbuka setiap 2 percobaan keliru. */
export function visibleHints(state: GameState): string[] {
  const hints = LEVELS[state.levelIndex].hints;
  return hints.slice(0, Math.min(hints.length, Math.floor(state.failedAttempts / 2)));
}
