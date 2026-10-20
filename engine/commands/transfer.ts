import type { Commit } from "../types";

/** Salinan target ditambah seluruh leluhur tip dari source yang belum ada di target. Tidak mengubah argumen, tidak menghapus apa pun. */
export function copyMissing(source: Record<string, Commit>, target: Record<string, Commit>, tip: string): Record<string, Commit> {
  const out = { ...target };
  const stack = [tip];
  while (stack.length) {
    const id = stack.pop() as string;
    if (out[id] || !source[id]) continue;
    out[id] = source[id];
    stack.push(...source[id].parents);
  }
  return out;
}

/** Jumlah commit yang akan disalin (ada di source, belum di target). */
export function countMissing(source: Record<string, Commit>, target: Record<string, Commit>, tip: string): number {
  return Object.keys(copyMissing(source, target, tip)).length - Object.keys(target).length;
}
