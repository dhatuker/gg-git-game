import { msg, raw } from "../messages";
import { failure, getHeadCommitId, isReachable, isValidBranchName, success } from "../state";
import type { CommandResult, Handler, RepoState } from "../types";

export function createBranch(state: RepoState, name: string): CommandResult {
  const headId = getHeadCommitId(state);
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
  if (name in state.branches) {
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
    return success(state, lines.map(raw));
  }
  if (args[0] === "-d") {
    const name = args[1];
    if (!name) return failure(state, msg("branch.deleteNeedsName"), "fatal: branch name required");
    if (!(name in state.branches)) {
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
    if (!headId || !isReachable(state, headId, state.branches[name])) {
      return failure(
        state,
        msg("branch.notMerged", { name }),
        `error: the branch '${name}' is not fully merged`,
      );
    }
    const branches = { ...state.branches };
    delete branches[name];
    return success({ ...state, branches }, [msg("branch.deleted", { name })], [{ type: "branch-dihapus", name }]);
  }
  return createBranch(state, args[0]);
};
