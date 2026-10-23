import { COMMAND_FLAGS, HANDLERS, hasOwn, runCommand } from "../engine";
import { parseInput } from "../engine/parse";
import type { GitEvent, RepoState } from "../engine/types";
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

/** Bagian state yang dipakai bersama oleh halaman level dan sandbox: repo, terminal, dan animasi. */
export interface Session {
  repo: RepoState;
  lines: TerminalLine[];
  /** Baris sebelum indeks ini disembunyikan oleh `clear`; tetap ada untuk rangkuman dan statistik. */
  clearedAt: number;
  events: GitEvent[];
  /** Pesan penjelasan untuk perintah sukses terakhir; diterjemahkan saat render. */
  caption: TMsg | null;
}

export const NOT_ALLOWED: TMsg = { key: "game.notAllowed" };
export const READ_ONLY_CAPTION: TMsg = { key: "caption.readOnly" };

/** Hasil satu input terminal: perintah milik terminal, perintah terkunci, atau perintah git (berhasil/gagal). */
export type InputOutcome = { kind: "terminal" } | { kind: "blocked" } | { kind: "git"; ok: boolean; name: string | null };

const CLEAR = /^(clear|cls)$/i;
const HELP = /^(?:help|git\s+(?:help|--help|-h))(?:\s+(\S+))?$/i;

/** Perintah milik terminal game (bukan git): bersihkan layar atau tampilkan bantuan. Null bila bukan. */
function runTerminalCommand<S extends Session>(state: S, input: string, allowed: string[]): S | null {
  if (CLEAR.test(input)) return { ...state, clearedAt: state.lines.length };
  const help = HELP.exec(input);
  if (!help) return null;
  const topic = help[1];
  const line: TerminalLine =
    topic === undefined
      ? { kind: "help", text: input, commands: allowed }
      : hasOwn(COMMAND_FLAGS, topic)
        ? { kind: "help", text: input, commands: [topic], topic }
        : { kind: "help", text: input, commands: allowed, unknown: topic };
  return { ...state, lines: [...state.lines, line] };
}

/** Jalankan satu input terminal di atas sesi; `allowed` = perintah git yang boleh dipakai. */
export function runSessionInput<S extends Session>(state: S, input: string, allowed: string[]): { state: S; outcome: InputOutcome } {
  const terminal = runTerminalCommand(state, input.trim(), allowed);
  if (terminal) return { state: terminal, outcome: { kind: "terminal" } };
  const lines: TerminalLine[] = [...state.lines, { kind: "input", text: input }];
  const parsed = parseInput(input);
  // Hanya perintah yang dikenal engine yang bisa "terkunci"; typo diteruskan ke engine agar mendapat saran.
  if (!("error" in parsed) && hasOwn(HANDLERS, parsed.name) && !allowed.includes(parsed.name)) {
    return { state: { ...state, lines: [...lines, { kind: "error", lines: [NOT_ALLOWED] }] }, outcome: { kind: "blocked" } };
  }
  const r = runCommand(state.repo, input);
  return {
    state: {
      ...state,
      repo: r.state,
      lines: [...lines, { kind: r.ok ? "output" : "error", lines: r.output }],
      events: r.events,
      caption: r.ok ? (describeEvents(r.events) ?? READ_ONLY_CAPTION) : state.caption,
    },
    outcome: { kind: "git", ok: r.ok, name: "error" in parsed ? null : parsed.name },
  };
}

/** Riwayat input pemain untuk tombol ↑/↓ (termasuk `git help`), tanpa duplikat berurutan. */
export function inputHistory(lines: TerminalLine[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if ((line.kind === "input" || line.kind === "help") && out.at(-1) !== line.text) out.push(line.text);
  }
  return out;
}
