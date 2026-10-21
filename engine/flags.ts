import { msg, type Msg } from "./messages";

/**
 * Opsi yang dikenali tiap perintah di game ini.
 * - `value`: opsi yang mengambil argumen berikutnya (misalnya isi pesan `-m`), jadi argumen itu bukan opsi.
 * - `selfChecked`: handler memeriksa opsinya sendiri dengan pesan yang lebih spesifik (reset, stash, remote).
 * Daftar `flags` juga dipakai `git help` untuk menampilkan opsi yang tersedia.
 */
export interface FlagSpec {
  flags: string[];
  value?: string[];
  selfChecked?: boolean;
}

export const COMMAND_FLAGS: Record<string, FlagSpec> = {
  init: { flags: [] },
  status: { flags: [] },
  add: { flags: ["-A", "--all"] },
  commit: { flags: ["-m", "-a"], value: ["-m"] },
  log: { flags: ["--oneline"] },
  branch: { flags: ["-d", "-D"] },
  switch: { flags: ["-c"] },
  checkout: { flags: ["-b"] },
  merge: { flags: ["--abort"] },
  reset: { flags: ["--soft", "--mixed", "--hard"], selfChecked: true },
  revert: { flags: [] },
  "cherry-pick": { flags: [] },
  stash: { flags: [], selfChecked: true },
  rebase: { flags: ["--continue", "--abort"] },
  clone: { flags: [], selfChecked: true },
  remote: { flags: ["-v"], selfChecked: true },
  fetch: { flags: [], selfChecked: true },
  push: { flags: [], selfChecked: true },
  pull: { flags: [], selfChecked: true },
};

/** `-am` → `-a -m` bila semua hurufnya opsi pendek yang dikenal; opsi bernilai hanya boleh di posisi terakhir. */
function expandShort(arg: string, spec: FlagSpec): string[] | null {
  if (!/^-[A-Za-z]{2,}$/.test(arg)) return null;
  const parts = [...arg.slice(1)].map((c) => `-${c}`);
  const known = parts.every((p) => spec.flags.includes(p));
  const valueInMiddle = parts.slice(0, -1).some((p) => spec.value?.includes(p));
  return known && !valueInMiddle ? parts : null;
}

/**
 * Periksa opsi `args` untuk perintah `name`. Kembalikan argumen yang sudah dinormalisasi
 * (gabungan opsi pendek dipecah), atau pesan error untuk opsi pertama yang belum didukung.
 */
export function checkFlags(name: string, args: string[]): { args: string[] } | { error: Msg } {
  const spec = COMMAND_FLAGS[name];
  if (!spec || spec.selfChecked) return { args };
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("-")) {
      out.push(arg);
      continue;
    }
    const parts = spec.flags.includes(arg) ? [arg] : expandShort(arg, spec);
    if (!parts) {
      if (spec.flags.length === 0) return { error: msg("flag.unsupportedNone", { flag: arg, cmd: name }) };
      const options = spec.flags.map((f) => `\`${f}\``).join(", ");
      return { error: msg("flag.unsupported", { flag: arg, cmd: name, options }) };
    }
    out.push(...parts);
    // Argumen setelah opsi bernilai (isi pesan commit) disalin apa adanya, walau diawali tanda minus.
    if (spec.value?.includes(parts[parts.length - 1]) && i + 1 < args.length) out.push(args[++i]);
  }
  return { args: out };
}

/** Nilai opsi `flag` (misalnya isi `-m`) dengan melewati nilai opsi lain; undefined bila tidak ada. */
export function flagValue(args: string[], flag: string, valueFlags: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag) return args[i + 1];
    if (valueFlags.includes(args[i])) i++;
  }
  return undefined;
}

/** True bila `flag` muncul sebagai opsi (bukan sebagai nilai opsi lain). */
export function hasFlag(args: string[], flag: string, valueFlags: string[]): boolean {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag) return true;
    if (valueFlags.includes(args[i])) i++;
  }
  return false;
}
