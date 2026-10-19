import { headSnapshot, success } from "../state";
import type { Handler } from "../types";

export const status: Handler = (state) => {
  const head = headSnapshot(state);
  const staged = Object.keys(state.index).filter((p) => state.index[p] !== head[p]);
  const unstaged = Object.keys(state.index).filter((p) => p in state.files && state.files[p] !== state.index[p]);
  const untracked = Object.keys(state.files).filter((p) => !(p in state.index));
  const lines: string[] = [];
  lines.push(state.head.type === "branch" ? `Di branch ${state.head.name}` : `HEAD terlepas (detached) di ${state.head.id}`);
  const section = (title: string, paths: string[]) => {
    if (paths.length === 0) return;
    lines.push("", title, ...paths.sort().map((p) => `    ${p}`));
  };
  section("Konflik belum diselesaikan:", state.mergeState ? [...state.mergeState.conflicts] : []);
  section("Perubahan yang akan di-commit:", staged);
  section("Perubahan yang belum di-stage:", unstaged);
  section("File yang belum dilacak:", untracked);
  if (lines.length === 1) lines.push("", "Tidak ada yang perlu di-commit, working tree bersih", "nothing to commit, working tree clean");
  return success(state, lines.join("\n"));
};
