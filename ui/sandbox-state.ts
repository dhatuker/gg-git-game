import { HANDLERS } from "../engine";
import { resolveConflict, writeFile, type EditResult } from "../engine/files";
import type { RepoState } from "../engine/types";
import { remoteWorld } from "../levels/history";
import { importGitLog, type ImportStats } from "../sandbox/import-log";
import { runSessionInput, type Session } from "./session";

/** Sumber riwayat sandbox: log yang ditempel/diunggah pemain, atau contoh proyek bawaan. */
export type SandboxSource = { kind: "log"; text: string } | { kind: "sample" };

/** Aksi yang mengubah sesi; dicatat agar sesi bisa diputar ulang setelah reload atau ganti bahasa. */
export type SandboxStep =
  | { type: "run"; input: string }
  | { type: "write"; file: string; content: string }
  | { type: "resolve"; file: string; choice: "ours" | "theirs" }
  | { type: "undo" }
  | { type: "reset" };

export type SandboxAction = SandboxStep | { type: "load"; source: SandboxSource } | { type: "close" } | { type: "restore"; saved: SavedSandbox };

export interface SandboxState extends Session {
  source: SandboxSource | null;
  /** Riwayat hasil impor; tidak pernah berubah selama sesi, jadi reset selalu bisa kembali ke sini. */
  initial: RepoState | null;
  stats: ImportStats | null;
  error: "empty" | "noCommits" | null;
  /** State repo sebelum tiap perubahan, untuk undo (paling baru di akhir). */
  past: RepoState[];
  steps: SandboxStep[];
}

export interface SavedSandbox {
  source: SandboxSource;
  steps: SandboxStep[];
}

/** Semua perintah engine boleh dipakai di sandbox. */
export const SANDBOX_COMMANDS = Object.keys(HANDLERS);

/** Batas undo agar memori tidak tumbuh tanpa batas pada sesi panjang. */
export const MAX_UNDO = 50;

export const EMPTY_SANDBOX: SandboxState = {
  repo: { initialized: false, files: {}, index: {}, commits: {}, branches: {}, head: { type: "branch", name: "main" }, mergeState: null, stash: [], rebaseState: null, remote: null, remoteRefs: {} },
  lines: [],
  clearedAt: 0,
  events: [],
  caption: null,
  source: null,
  initial: null,
  stats: null,
  error: null,
  past: [],
  steps: [],
};

function fresh(source: SandboxSource, repo: RepoState, stats: ImportStats | null): SandboxState {
  return { ...EMPTY_SANDBOX, source, initial: repo, repo, stats, caption: { key: "sandbox.loadedCaption" } };
}

function load(source: SandboxSource): SandboxState {
  if (source.kind === "sample") return fresh(source, remoteWorld({ cloned: true }), null);
  const r = importGitLog(source.text);
  if (!r.ok) return { ...EMPTY_SANDBOX, error: r.error };
  return fresh(source, r.state, r.stats);
}

/** Simpan repo lama ke tumpukan undo bila perubahan benar-benar mengubah repo. */
function remember(before: SandboxState, after: SandboxState): SandboxState {
  if (after.repo === before.repo) return after;
  return { ...after, past: [...before.past, before.repo].slice(-MAX_UNDO) };
}

function applyEdit(state: SandboxState, result: EditResult): SandboxState {
  if (result.error) return { ...state, lines: [...state.lines, { kind: "error", lines: [result.error] }] };
  return remember(state, { ...state, repo: result.state, events: [] });
}

function step(state: SandboxState, action: SandboxStep): SandboxState {
  switch (action.type) {
    case "run":
      return remember(state, runSessionInput(state, action.input, SANDBOX_COMMANDS).state);
    case "write":
      return applyEdit(state, writeFile(state.repo, action.file, action.content));
    case "resolve":
      return applyEdit(state, resolveConflict(state.repo, action.file, action.choice));
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...state,
        repo: previous,
        past: state.past.slice(0, -1),
        events: [],
        caption: { key: "sandbox.undoneCaption" },
        lines: [...state.lines, { kind: "output", lines: [{ key: "sandbox.undone" }] }],
      };
    }
    case "reset":
      if (!state.initial) return state;
      return { ...state, repo: state.initial, past: [], events: [], lines: [], clearedAt: 0, caption: { key: "sandbox.resetCaption" } };
  }
}

export function reduceSandbox(state: SandboxState, action: SandboxAction): SandboxState {
  switch (action.type) {
    case "load":
      return load(action.source);
    case "close":
      return EMPTY_SANDBOX;
    case "restore": {
      const loaded = load(action.saved.source);
      if (!loaded.initial) return EMPTY_SANDBOX;
      const replayed = action.saved.steps.reduce((s, a) => ({ ...step(s, a), steps: [...s.steps, a] }), loaded);
      // Pemutaran ulang tidak perlu animasi: tampilkan hasil akhirnya saja.
      return { ...replayed, events: [] };
    }
    default:
      if (!state.initial) return state;
      return { ...step(state, action), steps: [...state.steps, action] };
  }
}

/** Data kecil yang cukup untuk memulihkan sesi: sumber + langkah, bukan seluruh state repo. */
export function saveable(state: SandboxState): SavedSandbox | null {
  return state.source && state.initial ? { source: state.source, steps: state.steps } : null;
}

export const SANDBOX_KEY = "gg-git-game:sandbox";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Baca sesi tersimpan; data rusak atau bentuknya asing → null. */
export function parseSaved(raw: string | null | undefined): SavedSandbox | null {
  try {
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (!isObj(v) || !isObj(v.source) || !Array.isArray(v.steps)) return null;
    const src = v.source;
    const okSource = src.kind === "sample" || (src.kind === "log" && typeof src.text === "string");
    const okSteps = v.steps.every((s) => isObj(s) && ["run", "write", "resolve", "undo", "reset"].includes(s.type as string));
    return okSource && okSteps ? (v as unknown as SavedSandbox) : null;
  } catch {
    return null;
  }
}
