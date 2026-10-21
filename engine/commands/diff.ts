import { diffLines } from "../linediff";
import { msg, raw, type OutputLine } from "../messages";
import { failure, headSnapshot, success } from "../state";
import type { Files, Handler } from "../types";

/** Baris diff bergaya git untuk satu file. `before` undefined = file baru. Satu hunk berisi seluruh file. */
function fileDiff(path: string, before: string | undefined, after: string): OutputLine[] {
  const lines = diffLines(before ?? "", after);
  const oldCount = lines.filter((l) => l.op !== "+").length;
  const newCount = lines.filter((l) => l.op !== "-").length;
  const out: OutputLine[] = [raw(`diff --git a/${path} b/${path}`, "meta")];
  if (before === undefined) out.push(raw("new file mode 100644", "meta"));
  out.push(
    raw(before === undefined ? "--- /dev/null" : `--- a/${path}`, "meta"),
    raw(`+++ b/${path}`, "meta"),
    raw(`@@ -${oldCount ? 1 : 0},${oldCount} +${newCount ? 1 : 0},${newCount} @@`, "meta"),
  );
  for (const l of lines) out.push(l.op === " " ? raw(` ${l.text}`) : raw(`${l.op}${l.text}`, l.op === "+" ? "add" : "del"));
  return out;
}

/** Path yang isinya berbeda antara `left` dan `right` (hanya yang ada di `right`), urut nama. */
function changed(left: Files, right: Files, only: string[] | null): string[] {
  return Object.keys(right)
    .filter((p) => (only ? only.includes(p) : true) && left[p] !== right[p])
    .sort();
}

/**
 * `git diff` membandingkan staging dengan working directory (file terlacak saja);
 * `git diff --staged`/`--cached` membandingkan HEAD dengan staging. Hanya membaca.
 */
export const diff: Handler = (state, args) => {
  const staged = args.includes("--staged") || args.includes("--cached");
  const paths = args.filter((a) => !a.startsWith("-"));
  const head = headSnapshot(state);
  const unknown = paths.find((p) => !(p in state.files) && !(p in state.index) && !(p in head));
  if (unknown) {
    return failure(
      state,
      msg("diff.unknownPath", { file: unknown }),
      `fatal: ambiguous argument '${unknown}': unknown revision or path not in the working tree.`,
    );
  }
  const only = paths.length ? paths : null;
  const events = [{ type: "diff-ditampilkan" as const, staged }];
  const [left, right] = staged ? [head, state.index] : [state.index, state.files];
  // Tanpa --staged, hanya file terlacak (ada di index) yang dibandingkan.
  const rightTracked = staged ? right : Object.fromEntries(Object.entries(right).filter(([p]) => p in state.index));
  const files = changed(left, rightTracked, only);

  if (files.length > 0) {
    const out: OutputLine[] = [msg(staged ? "diff.staged" : "diff.unstaged")];
    for (const p of files) out.push(...fileDiff(p, left[p], rightTracked[p]));
    return success(state, out, events);
  }
  const untracked = paths.find((p) => p in state.files && !(p in state.index));
  if (untracked) return success(state, [msg("diff.untracked", { file: untracked })], events);
  if (staged) return success(state, [msg("diff.noneStaged")], events);
  const anyStaged = changed(head, state.index, null).length > 0;
  return success(state, [msg(anyStaged ? "diff.noneUnstagedButStaged" : "diff.noneUnstaged")], events);
};
