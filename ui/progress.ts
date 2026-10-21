/** Kunci lama (penomoran level sebelum jalur "Periksa & rapikan"); dibiarkan sebagai cadangan. */
export const KEY_V1 = "gg-git-game:completed";
/** Kunci aktif: level 6–9 baru, level lama 6–21 menjadi 10–25. */
export const KEY_V2 = "gg-git-game:completed-v2";
const EVENT = "gg-git-game:progress";

function defaultStorage(): Storage | undefined {
  try {
    return typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Ubah isi storage mentah menjadi daftar id level. Data rusak → []. */
export function parseCompleted(raw: string | null | undefined): number[] {
  try {
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === "number" && Number.isInteger(n))) return [];
    return parsed;
  } catch {
    return [];
  }
}

/** Petakan id level penomoran lama ke yang baru: 1–5 tetap, 6–21 bergeser +4; lainnya dibuang. */
export function migrateCompletedV1(ids: number[]): number[] {
  const mapped = ids.filter((n) => Number.isInteger(n) && n >= 1 && n <= 21).map((n) => (n <= 5 ? n : n + 4));
  return [...new Set(mapped)].sort((a, b) => a - b);
}

/**
 * Pindahkan progres lama ke kunci v2 sekali saja: hanya bila v2 belum ada sama sekali dan v1 ada.
 * v2 yang sudah ada (termasuk yang rusak) tidak pernah ditimpa. Tidak pernah melempar.
 */
export function ensureMigrated(storage: Pick<Storage, "getItem" | "setItem"> | undefined = defaultStorage()): void {
  try {
    if (!storage || storage.getItem(KEY_V2) !== null) return;
    const old = storage.getItem(KEY_V1);
    if (old === null) return;
    storage.setItem(KEY_V2, JSON.stringify(migrateCompletedV1(parseCompleted(old))));
  } catch {
    // Storage diblokir: game jalan tanpa progres tersimpan.
  }
}

/** Id level yang sudah selesai. Data rusak atau storage yang tidak tersedia → []. */
export function loadCompleted(storage: Pick<Storage, "getItem" | "setItem"> | undefined = defaultStorage()): number[] {
  ensureMigrated(storage);
  try {
    return parseCompleted(storage?.getItem(KEY_V2));
  } catch {
    return [];
  }
}

export function saveCompleted(completed: number[], storage: Pick<Storage, "setItem"> | undefined = defaultStorage()): void {
  try {
    storage?.setItem(KEY_V2, JSON.stringify(completed));
  } catch {
    // Penyimpanan tidak tersedia (mode privat, diblokir): game tetap jalan tanpa menyimpan.
  }
  // Beri tahu halaman lain di tab ini (beranda, peta level) yang membaca progres lewat useSyncExternalStore.
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Untuk useSyncExternalStore: snapshot mentah (string stabil) dan langganan perubahan. */
export function progressSnapshot(): string | null {
  ensureMigrated();
  try {
    return defaultStorage()?.getItem(KEY_V2) ?? null;
  } catch {
    return null;
  }
}

export function subscribeProgress(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}
