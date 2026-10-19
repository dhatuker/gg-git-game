import { failure, success } from "../state";
import type { GitEvent, Handler } from "../types";

export const add: Handler = (state, args) => {
  if (args.length === 0) {
    return failure(state, "Sebutkan file yang mau di-stage, misalnya `git add README.md` atau `git add .`.", "Nothing specified, nothing added.");
  }
  let paths: string[];
  if (args.includes(".")) {
    paths = Object.keys(state.files);
  } else {
    const missing = args.find((a) => !(a in state.files));
    if (missing) {
      return failure(state, `File \`${missing}\` tidak ada di working directory.`, `fatal: pathspec '${missing}' did not match any files`);
    }
    paths = args;
  }
  const index = { ...state.index };
  const events: GitEvent[] = [];
  for (const p of paths) {
    if (index[p] !== state.files[p]) {
      index[p] = state.files[p];
      events.push({ type: "file-di-stage", file: p });
    }
  }
  const mergeState = state.mergeState
    ? { ...state.mergeState, conflicts: state.mergeState.conflicts.filter((c) => !paths.includes(c)) }
    : null;
  const resolved = state.mergeState ? state.mergeState.conflicts.filter((c) => paths.includes(c)) : [];
  const lines: string[] = [];
  if (events.length) {
    lines.push(`File masuk staging: ${events.map((e) => (e.type === "file-di-stage" ? e.file : "")).join(", ")}`);
  }
  if (resolved.length && mergeState) {
    lines.push(`Konflik di ${resolved.map((f) => `\`${f}\``).join(", ")} ditandai selesai.`);
    lines.push(
      mergeState.conflicts.length
        ? `Masih ada konflik di: ${mergeState.conflicts.join(", ")}.`
        : "Semua konflik selesai. Lanjutkan dengan `git commit -m \"...\"` untuk membuat merge commit.",
    );
  }
  if (lines.length === 0) lines.push("Tidak ada perubahan baru untuk di-stage.");
  return success({ ...state, index, mergeState }, lines.join("\n"), events);
};
