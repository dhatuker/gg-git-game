import type { Files } from "./types";

/** Gabungan tiga arah per file: base, ours (HEAD), theirs. */
export function threeWay(
  base: Files,
  ours: Files,
  theirs: Files,
  label: string,
): { merged: Files; conflictFiles: Files; conflicts: string[] } {
  const merged: Files = {};
  const conflictFiles: Files = {};
  const conflicts: string[] = [];
  for (const p of [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort()) {
    let value: string | undefined;
    if (ours[p] === theirs[p]) value = ours[p];
    else if (base[p] === ours[p]) value = theirs[p];
    else if (base[p] === theirs[p]) value = ours[p];
    else {
      conflicts.push(p);
      conflictFiles[p] = `<<<<<<< HEAD\n${ours[p] ?? ""}\n=======\n${theirs[p] ?? ""}\n>>>>>>> ${label}`;
      if (ours[p] !== undefined) merged[p] = ours[p];
      continue;
    }
    if (value !== undefined) merged[p] = value;
  }
  return { merged, conflictFiles, conflicts };
}
