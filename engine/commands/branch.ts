import { hasOwn } from "../own";
import { msg, raw } from "../messages";
import { resolveRevision } from "../revision";
import { failure, getHeadCommitId, isReachable, isValidBranchName, success } from "../state";
import type { CommandResult, Handler, RepoState } from "../types";

/** Buat branch `name` di commit `at` (bawaan: commit HEAD). */
export function createBranch(state: RepoState, name: string, at?: string): CommandResult {
  const headId = at ?? getHeadCommitId(state);
  if (!headId) {
    return failure(
      state,
      msg("branch.noCommits"),
      `fatal: not a valid object name: '${state.head.type === "branch" ? state.head.name : "HEAD"}'`,
    );
  }
  if (!isValidBranchName(name)) {
    return failure(
      state,
      msg("branch.invalidName", { name }),
      `fatal: '${name}' is not a valid branch name`,
    );
  }
  if (hasOwn(state.branches, name)) {
    return failure(state, msg("branch.exists", { name }), `fatal: a branch named '${name}' already exists`);
  }
  return success(
    { ...state, branches: { ...state.branches, [name]: headId } },
    [msg("branch.created", { name, id: headId })],
    [{ type: "branch-dibuat", name, at: headId }],
  );
}

export const branch: Handler = (state, args) => {
  if (args.length === 0) {
    const names = Object.keys(state.branches).sort((a, b) => (a === "main" ? -1 : b === "main" ? 1 : a.localeCompare(b)));
    if (names.length === 0) return success(state, [msg("branch.noneYet")]);
    const current = state.head.type === "branch" ? state.head.name : null;
    const lines = names.map((n) => `${n === current ? "* " : "  "}${n}`);
    if (state.head.type === "detached") lines.unshift(`* (HEAD detached at ${state.head.id})`);
    return success(state, lines.map((t) => raw(t)));
  }
  if (args[0] === "-d" || args[0] === "-D") {
    const force = args[0] === "-D";
    const name = args[1];
    if (!name) return failure(state, msg("branch.deleteNeedsName"), "fatal: branch name required");
    if (!hasOwn(state.branches, name)) {
      return failure(state, msg("branch.notFound", { name }), `error: branch '${name}' not found`);
    }
    if (state.head.type === "branch" && state.head.name === name) {
      return failure(
        state,
        msg("branch.deleteCurrent", { name }),
        `error: cannot delete branch '${name}' used by worktree (checked out)`,
      );
    }
    const headId = getHeadCommitId(state);
    if (!force && (!headId || !isReachable(state, headId, state.branches[name]))) {
      return failure(
        state,
        msg("branch.notMerged", { name }),
        `error: the branch '${name}' is not fully merged`,
      );
    }
    const branches = { ...state.branches };
    delete branches[name];
    const output = force
      ? [msg("branch.forceDeleted", { name }), raw(`Deleted branch ${name} (was ${state.branches[name]}).`)]
      : [msg("branch.deleted", { name })];
    return success({ ...state, branches }, output, [{ type: "branch-dihapus", name }]);
  }
  if (args.length > 1) {
    const start = resolveRevision(state, args[1]);
    if ("error" in start) return failure(state, start.error, start.git);
    return createBranch(state, args[0], start.id);
  }
  return createBranch(state, args[0]);
};
