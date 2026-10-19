import { failure, getHeadCommitId, isReachable, isValidBranchName, success } from "../state";
import type { CommandResult, Handler, RepoState } from "../types";

export function createBranch(state: RepoState, name: string): CommandResult {
  const headId = getHeadCommitId(state);
  if (!headId) {
    return failure(
      state,
      "Branch hanya bisa dibuat setelah ada commit pertama.",
      `fatal: not a valid object name: '${state.head.type === "branch" ? state.head.name : "HEAD"}'`,
    );
  }
  if (!isValidBranchName(name)) {
    return failure(
      state,
      `Nama branch \`${name}\` tidak valid. Gunakan huruf, angka, titik, garis bawah, garis miring, atau tanda minus (tidak boleh diawali tanda minus).`,
      `fatal: '${name}' is not a valid branch name`,
    );
  }
  if (name in state.branches) {
    return failure(state, `Branch \`${name}\` sudah ada.`, `fatal: a branch named '${name}' already exists`);
  }
  return success(
    { ...state, branches: { ...state.branches, [name]: headId } },
    `Branch \`${name}\` dibuat di commit ${headId}.`,
    [{ type: "branch-dibuat", name, at: headId }],
  );
}

export const branch: Handler = (state, args) => {
  if (args.length === 0) {
    const names = Object.keys(state.branches).sort((a, b) => (a === "main" ? -1 : b === "main" ? 1 : a.localeCompare(b)));
    if (names.length === 0) return success(state, "Belum ada branch karena belum ada commit.");
    const current = state.head.type === "branch" ? state.head.name : null;
    const lines = names.map((n) => `${n === current ? "* " : "  "}${n}`);
    if (state.head.type === "detached") lines.unshift(`* (HEAD terlepas di ${state.head.id})`);
    return success(state, lines.join("\n"));
  }
  if (args[0] === "-d") {
    const name = args[1];
    if (!name) return failure(state, "Sebutkan branch yang mau dihapus: `git branch -d <nama>`.", "fatal: branch name required");
    if (!(name in state.branches)) {
      return failure(state, `Branch \`${name}\` tidak ditemukan.`, `error: branch '${name}' not found`);
    }
    if (state.head.type === "branch" && state.head.name === name) {
      return failure(
        state,
        `Tidak bisa menghapus branch \`${name}\` karena sedang dipakai. Pindah ke branch lain dulu.`,
        `error: cannot delete branch '${name}' used by worktree (checked out)`,
      );
    }
    const headId = getHeadCommitId(state);
    if (!headId || !isReachable(state, headId, state.branches[name])) {
      return failure(
        state,
        `Branch \`${name}\` punya commit yang belum di-merge. Merge dulu agar commit-nya tidak hilang.`,
        `error: the branch '${name}' is not fully merged`,
      );
    }
    const branches = { ...state.branches };
    delete branches[name];
    return success({ ...state, branches }, `Branch \`${name}\` dihapus.`, [{ type: "branch-dihapus", name }]);
  }
  return createBranch(state, args[0]);
};
