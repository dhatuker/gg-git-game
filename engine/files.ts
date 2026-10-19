import { msg, type Msg } from "./messages";
import type { RepoState } from "./types";

export interface EditResult {
  state: RepoState;
  error?: Msg;
}

const VALID_NAME = /^[\w.-]+$/;

/** Membuat atau menimpa file di working directory (bukan perintah git). */
export function writeFile(state: RepoState, name: string, content: string): EditResult {
  if (!VALID_NAME.test(name)) {
    return { state, error: msg("files.invalidName") };
  }
  return { state: { ...state, files: { ...state.files, [name]: content } } };
}

/** Mengisi file konflik dengan versi HEAD (`ours`) atau versi branch yang di-merge (`theirs`). Tidak men-stage. */
export function resolveConflict(state: RepoState, file: string, choice: "ours" | "theirs"): EditResult {
  if (!state.mergeState || !state.mergeState.conflicts.includes(file)) {
    return { state, error: msg("files.notConflicted", { file }) };
  }
  const headId = state.head.type === "branch" ? state.branches[state.head.name] : state.head.id;
  const sourceId = choice === "ours" ? headId : state.mergeState.fromCommit;
  const content = state.commits[sourceId]?.snapshot[file] ?? "";
  return { state: { ...state, files: { ...state.files, [file]: content } } };
}
