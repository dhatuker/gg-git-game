import { msg, type OutputLine } from "../messages";
import { failure, success } from "../state";
import type { GitEvent, Handler } from "../types";

export const add: Handler = (state, args) => {
  if (args.length === 0) {
    return failure(state, msg("add.nothingSpecified"), "Nothing specified, nothing added.");
  }
  let paths: string[];
  if (args.includes(".")) {
    paths = Object.keys(state.files);
  } else {
    const missing = args.find((a) => !(a in state.files));
    if (missing) {
      return failure(state, msg("add.missingFile", { file: missing }), `fatal: pathspec '${missing}' did not match any files`);
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
  const lines: OutputLine[] = [];
  if (events.length) {
    lines.push(msg("add.staged", { files: events.map((e) => (e.type === "file-di-stage" ? e.file : "")).join(", ") }));
  }
  if (resolved.length && mergeState) {
    lines.push(msg("add.conflictResolved", { files: resolved.join(", ") }));
    lines.push(
      mergeState.conflicts.length
        ? msg("add.conflictsRemain", { files: mergeState.conflicts.join(", ") })
        : msg("add.allConflictsResolved"),
    );
  }
  if (lines.length === 0) lines.push(msg("add.nothingNew"));
  return success({ ...state, index, mergeState }, lines, events);
};
