import { LEVELS } from "../levels";
import type { TerminalLine } from "./game-state";

/** Perintah yang baru terbuka di level ini (tidak ada di level sebelumnya). */
export function newCommands(index: number): string[] {
  const level = LEVELS[index];
  if (!level) return [];
  const before = new Set(index > 0 ? LEVELS[index - 1].allowedCommands : []);
  return level.allowedCommands.filter((c) => !before.has(c));
}

/** Semua perintah yang sudah dikenalkan sampai level `index` (inklusif), dengan id level tempat pertama muncul. */
export function learnedCommands(index: number): { name: string; levelId: number }[] {
  const out: { name: string; levelId: number }[] = [];
  for (let i = 0; i <= index && i < LEVELS.length; i++) {
    for (const name of newCommands(i)) out.push({ name, levelId: LEVELS[i].id });
  }
  return out;
}

/** Input pemain yang berhasil (diikuti output, bukan error), tanpa duplikat berurutan. */
export function succeededInputs(lines: TerminalLine[]): string[] {
  const out: string[] = [];
  lines.forEach((line, i) => {
    if (line.kind !== "input") return;
    const next = lines[i + 1];
    if (next && next.kind === "output" && !out.includes(line.text)) out.push(line.text);
  });
  return out;
}

/** Berapa baris terminal yang merupakan input pemain. */
export function countInputs(lines: TerminalLine[]): number {
  return lines.filter((l) => l.kind === "input").length;
}
