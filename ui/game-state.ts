import { resolveConflict, writeFile, type EditResult } from "../engine/files";
import { LEVELS, type Localized } from "../levels";
import { runSessionInput, type Session } from "./session";

export { inputHistory, NOT_ALLOWED, READ_ONLY_CAPTION, type TerminalLine } from "./session";

export interface GameState extends Session {
  levelIndex: number;
  completed: number[];
  ran: string[];
  failedAttempts: number;
  /** Jumlah petunjuk yang sudah dibuka pemain lewat tombol "Minta petunjuk". */
  hintsRevealed: number;
  /** Kegagalan sejak petunjuk terakhir dibuka; dipakai untuk menyorot tombol petunjuk. */
  failedSinceHint: number;
  levelComplete: boolean;
}

export type GameAction =
  | { type: "run"; input: string }
  | { type: "write"; file: string; content: string }
  | { type: "resolve"; file: string; choice: "ours" | "theirs" }
  | { type: "reset-level" }
  | { type: "goto-level"; index: number }
  | { type: "reveal-hint" }
  /** Pulihkan state yang dibawa saat ganti bahasa; level selesai digabung dengan progres tersimpan agar tidak hilang. */
  | { type: "restore"; state: GameState; savedCompleted: number[] }
  | { type: "load-progress"; completed: number[] }
  /** Masuk ke level dari rute /play/[level] dengan progres tersimpan; level terkunci jatuh ke level terbuka pertama. */
  | { type: "enter-level"; completed: number[]; index: number };


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
    hintsRevealed: 0,
    failedSinceHint: 0,
    lines: [],
    clearedAt: 0,
    events: [],
    caption: null,
    levelComplete: false,
  };
}

/** State awal sebuah level tanpa memeriksa kunci; dipakai render server untuk rute /play/[level]. */
export function startAt(index: number, completed: number[] = []): GameState {
  return startLevel(index, completed);
}

/** Level pertama yang belum selesai; bila semuanya selesai, level terakhir. */
export function firstOpenIndex(completed: number[]): number {
  const first = LEVELS.findIndex((l) => !completed.includes(l.id));
  return first === -1 ? LEVELS.length - 1 : first;
}

/** Tanpa `index`, mulai di level pertama yang belum selesai. Dengan `index` yang masih terkunci, jatuh ke level itu juga. */
export function initGame(completed: number[], index?: number): GameState {
  const open = firstOpenIndex(completed);
  const ok = index !== undefined && index >= 0 && index < LEVELS.length && isUnlocked(completed, index);
  return startLevel(ok ? index : open, completed);
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
    return { ...state, lines: [...state.lines, { kind: "error", lines: [result.error] }] };
  }
  return withGoalCheck({ ...state, repo: result.state });
}

function runInput(state: GameState, input: string): GameState {
  const { state: next, outcome } = runSessionInput(state, input, LEVELS[state.levelIndex].allowedCommands);
  if (outcome.kind === "terminal") return next;
  const failed = outcome.kind === "blocked" || !outcome.ok;
  const name = outcome.kind === "git" && outcome.ok ? outcome.name : null;
  const counted: GameState = {
    ...next,
    failedAttempts: failed ? state.failedAttempts + 1 : state.failedAttempts,
    failedSinceHint: failed ? state.failedSinceHint + 1 : state.failedSinceHint,
    ran: name && !state.ran.includes(name) ? [...state.ran, name] : state.ran,
  };
  return outcome.kind === "blocked" ? counted : withGoalCheck(counted);
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
    case "reveal-hint": {
      const total = LEVELS[state.levelIndex].hints.length;
      if (state.hintsRevealed >= total) return state;
      return { ...state, hintsRevealed: state.hintsRevealed + 1, failedSinceHint: 0 };
    }
    case "restore":
      return {
        ...action.state,
        clearedAt: Number.isInteger(action.state.clearedAt) ? action.state.clearedAt : 0,
        completed: [...new Set([...action.state.completed, ...action.savedCompleted])].sort((a, b) => a - b),
      };
    case "load-progress":
      return initGame(action.completed);
    case "enter-level":
      return initGame(action.completed, action.index);
  }
}

/** Petunjuk yang sudah dibuka pemain, dari yang paling samar. */
export function visibleHints(state: GameState): Localized[] {
  return LEVELS[state.levelIndex].hints.slice(0, state.hintsRevealed);
}

/** Sorot tombol petunjuk setelah 2 kegagalan sejak petunjuk terakhir, selama masih ada yang tertutup. */
export function hintNudge(state: GameState): boolean {
  return state.failedSinceHint >= 2 && state.hintsRevealed < LEVELS[state.levelIndex].hints.length;
}
