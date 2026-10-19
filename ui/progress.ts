const KEY = "gg-git-game:completed";

function defaultStorage(): Storage | undefined {
  try {
    return typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Id level yang sudah selesai. Data rusak atau storage yang tidak tersedia → []. */
export function loadCompleted(storage: Pick<Storage, "getItem"> | undefined = defaultStorage()): number[] {
  try {
    if (!storage) return [];
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === "number" && Number.isInteger(n))) return [];
    return parsed;
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
}
