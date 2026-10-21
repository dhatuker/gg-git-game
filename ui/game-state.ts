import { COMMAND_FLAGS, HANDLERS, runCommand } from "../engine";
import { resolveConflict, writeFile, type EditResult } from "../engine/files";
import { parseInput } from "../engine/parse";
import type { GitEvent, RepoState } from "../engine/types";
import { LEVELS, type Localized } from "../levels";
import type { TLine, TMsg } from "../i18n/types";
import { describeEvents } from "./caption";

/**
 * Baris terminal: input pemain apa adanya, output berupa pesan berkunci + baris raw, atau bantuan `git help`
 * (input + daftar perintah; teksnya disusun saat render agar ikut bahasa aktif).
 */
export type TerminalLine =
  | { kind: "input"; text: string }
  | { kind: "output" | "error"; lines: TLine[] }
  | { kind: "help"; text: string; commands: string[]; topic?: string; unknown?: string };

export interface GameState {
  levelIndex: number;
  repo: RepoState;
  completed: number[];
  ran: string[];
  failedAttempts: number;
  /** Jumlah petunjuk yang sudah dibuka pemain lewat tombol "Minta petunjuk". */
  hintsRevealed: number;
  /** Kegagalan sejak petunjuk terakhir dibuka; dipakai untuk menyorot tombol petunjuk. */
  failedSinceHint: number;
  lines: TerminalLine[];
  /** Baris sebelum indeks ini disembunyikan oleh `clear`; tetap ada untuk rangkuman dan statistik. */
  clearedAt: number;
  events: GitEvent[];
  /** Pesan penjelasan untuk perintah sukses terakhir; diterjemahkan saat render. */
  caption: TMsg | null;
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

export const NOT_ALLOWED: TMsg = { key: "game.notAllowed" };
export const READ_ONLY_CAPTION: TMsg = { key: "caption.readOnly" };

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

const CLEAR = /^(clear|cls)$/i;
const HELP = /^(?:help|git\s+(?:help|--help|-h))(?:\s+(\S+))?$/i;

/** Perintah milik terminal game (bukan git): bersihkan layar atau tampilkan bantuan. Null bila bukan. */
function runTerminalCommand(state: GameState, input: string): GameState | null {
  if (CLEAR.test(input)) return { ...state, clearedAt: state.lines.length };
  const help = HELP.exec(input);
  if (!help) return null;
  const allowed = LEVELS[state.levelIndex].allowedCommands;
  const topic = help[1];
  const line: TerminalLine =
    topic === undefined
      ? { kind: "help", text: input, commands: allowed }
      : topic in COMMAND_FLAGS
        ? { kind: "help", text: input, commands: [topic], topic }
        : { kind: "help", text: input, commands: allowed, unknown: topic };
  return { ...state, lines: [...state.lines, line] };
}

/** Riwayat input pemain untuk tombol ↑/↓ (termasuk `git help`), tanpa duplikat berurutan. */
export function inputHistory(lines: TerminalLine[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if ((line.kind === "input" || line.kind === "help") && out.at(-1) !== line.text) out.push(line.text);
  }
  return out;
}

function runInput(state: GameState, input: string): GameState {
  const terminal = runTerminalCommand(state, input.trim());
  if (terminal) return terminal;
  const level = LEVELS[state.levelIndex];
  const lines: TerminalLine[] = [...state.lines, { kind: "input", text: input }];
  const parsed = parseInput(input);
  // Hanya perintah yang dikenal engine yang bisa "terkunci"; typo diteruskan ke engine agar mendapat saran.
  if (!("error" in parsed) && parsed.name in HANDLERS && !level.allowedCommands.includes(parsed.name)) {
    return {
      ...state,
      lines: [...lines, { kind: "error", lines: [NOT_ALLOWED] }],
      failedAttempts: state.failedAttempts + 1,
      failedSinceHint: state.failedSinceHint + 1,
    };
  }
  const r = runCommand(state.repo, input);
  const next: GameState = {
    ...state,
    repo: r.state,
    lines: [...lines, { kind: r.ok ? "output" : "error", lines: r.output }],
    failedAttempts: r.ok ? state.failedAttempts : state.failedAttempts + 1,
    failedSinceHint: r.ok ? state.failedSinceHint : state.failedSinceHint + 1,
    ran: r.ok && !("error" in parsed) && !state.ran.includes(parsed.name) ? [...state.ran, parsed.name] : state.ran,
    events: r.events,
    caption: r.ok ? (describeEvents(r.events) ?? READ_ONLY_CAPTION) : state.caption,
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
