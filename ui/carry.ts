import { LEVELS } from "../levels";
import type { Lang } from "../i18n/types";
import type { GameState } from "./game-state";

/** State level yang dibawa saat pindah halaman bahasa (sekali pakai). */
export const CARRY_KEY = "gg-git-game:carry";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function isGameState(v: unknown): v is GameState {
  if (!isObj(v)) return false;
  const repo = v.repo;
  return (
    Number.isInteger(v.levelIndex) &&
    (v.levelIndex as number) >= 0 &&
    (v.levelIndex as number) < LEVELS.length &&
    isObj(repo) &&
    typeof repo.initialized === "boolean" &&
    isObj(repo.files) &&
    isObj(repo.index) &&
    isObj(repo.commits) &&
    isObj(repo.branches) &&
    isObj(repo.head) &&
    Array.isArray(v.completed) &&
    Array.isArray(v.ran) &&
    Array.isArray(v.lines) &&
    isNum(v.failedAttempts) &&
    isNum(v.hintsRevealed) &&
    isNum(v.failedSinceHint) &&
    typeof v.levelComplete === "boolean"
  );
}

/** Batas umur carry: pindah halaman normal selesai dalam hitungan detik; yang lebih tua berasal dari pindah yang dibatalkan. */
export const CARRY_MAX_AGE_MS = 30_000;

/** Simpan state untuk halaman bahasa `target`, distempel bahasa dan waktu. */
export function saveCarry(state: GameState, target: Lang, storage?: Pick<Storage, "setItem">, now: number = Date.now()): void {
  try {
    (storage ?? globalThis.sessionStorage)?.setItem(CARRY_KEY, JSON.stringify({ v: 1, lang: target, at: now, state }));
  } catch {
    // storage diblokir: pemain mulai dari progres tersimpan di halaman baru
  }
}

/**
 * Ambil state yang dibawa ke halaman bahasa `lang` lalu hapus. Ditolak (null) bila bentuknya tidak dikenal,
 * bahasanya lain, atau lebih tua dari CARRY_MAX_AGE_MS. Tidak pernah melempar.
 */
export function takeCarry(lang: Lang, storage?: Pick<Storage, "getItem" | "removeItem">, now: number = Date.now()): GameState | null {
  try {
    const store = storage ?? globalThis.sessionStorage;
    const raw = store?.getItem(CARRY_KEY);
    if (raw == null) return null;
    store.removeItem(CARRY_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (!isObj(parsed) || parsed.v !== 1 || parsed.lang !== lang || !isNum(parsed.at)) return null;
    if (now - parsed.at > CARRY_MAX_AGE_MS || now < parsed.at) return null;
    if (!isGameState(parsed.state)) return null;
    // Simpanan lama belum punya stash/rebaseState: isi nilai awalnya agar tetap bisa dimuat.
    const repo = parsed.state.repo;
    // Bentuk rusak (bukan array / bukan objek) juga dinormalisasi agar engine tidak tersandung.
    const loose = repo as unknown as Record<string, unknown>;
    const stash = Array.isArray(loose.stash) ? repo.stash : [];
    const rebaseState = isObj(loose.rebaseState) ? repo.rebaseState : null;
    const remote = isObj(loose.remote) ? repo.remote : null;
    const remoteRefs = isObj(loose.remoteRefs) ? repo.remoteRefs : {};
    return { ...parsed.state, repo: { ...repo, stash, rebaseState, remote, remoteRefs }, events: [] };
  } catch {
    return null;
  }
}
