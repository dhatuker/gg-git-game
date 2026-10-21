import { msg } from "../messages";
import { failure, headSnapshot, inProgressBlock, success } from "../state";
import type { Files, Handler } from "../types";

/**
 * `git restore <file…>`: kembalikan file di working directory ke isi staging.
 * `git restore --staged <file…>`: kembalikan staging ke isi HEAD; file yang belum pernah di-commit kembali tak terlacak.
 * `.` memilih semua path yang berbeda. Semua path divalidasi dulu: satu path salah, tidak ada yang diubah.
 */
export const restore: Handler = (state, args) => {
  const staged = args.includes("--staged");
  const paths = args.filter((a) => !a.startsWith("-"));
  if (paths.length === 0) return failure(state, msg("restore.needPath"), "fatal: you must specify path(s) to restore");
  const blocked = inProgressBlock(state);
  if (blocked) return blocked;

  const head = headSnapshot(state);
  // Sumber (yang dipulihkan) dan tujuan (yang diubah).
  const [source, target]: [Files, Files] = staged ? [head, state.index] : [state.index, state.files];
  const known = (p: string) => (staged ? p in state.index || p in head : p in state.index);
  const all = paths.includes(".");
  const unknown = paths.find((p) => p !== "." && !known(p));
  if (unknown) {
    return failure(
      state,
      msg("restore.unknownPath", { file: unknown }),
      `error: pathspec '${unknown}' did not match any file(s) known to git`,
    );
  }
  const candidates = all ? [...new Set([...Object.keys(source), ...Object.keys(target)])].filter(known) : paths;
  const files = [...new Set(candidates)].filter((p) => source[p] !== target[p]).sort();
  if (files.length === 0) return success(state, [msg("restore.nothing")]);

  const next: Files = { ...target };
  for (const p of files) {
    if (p in source) next[p] = source[p];
    else delete next[p];
  }
  const restored = staged ? { ...state, index: next } : { ...state, files: next };
  return success(restored, [msg(staged ? "restore.unstaged" : "restore.done", { files: files.join(", ") })], [
    { type: "restore-dilakukan", files, staged },
  ]);
};
