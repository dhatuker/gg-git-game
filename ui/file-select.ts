/** File yang dibuka editor bila pemain belum memilih: file konflik pertama, selain itu file pertama. */
export function defaultFile(names: readonly string[], conflicts: readonly string[]): string | null {
  return conflicts.find((c) => names.includes(c)) ?? names[0] ?? null;
}
