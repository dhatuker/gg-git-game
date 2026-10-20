const KEY = "gg-git-game:completed";
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

/** Id level yang sudah selesai. Data rusak atau storage yang tidak tersedia → []. */
export function loadCompleted(storage: Pick<Storage, "getItem"> | undefined = defaultStorage()): number[] {
  try {
    return parseCompleted(storage?.getItem(KEY));
  } catch {
    return [];
  }
}

export function saveCompleted(completed: number[], storage: Pick<Storage, "setItem"> | undefined = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(completed));
  } catch {
    // Penyimpanan tidak tersedia (mode privat, diblokir): game tetap jalan tanpa menyimpan.
  }
  // Beri tahu halaman lain di tab ini (beranda, peta level) yang membaca progres lewat useSyncExternalStore.
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Untuk useSyncExternalStore: snapshot mentah (string stabil) dan langganan perubahan. */
export function progressSnapshot(): string | null {
  try {
    return defaultStorage()?.getItem(KEY) ?? null;
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
