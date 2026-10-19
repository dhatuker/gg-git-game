import { msg } from "../messages";
import { failure, getHeadCommitId, rawLines, success } from "../state";
import type { Commit, Handler, RepoState } from "../types";

/** Semua commit yang terjangkau dari id, urut seq menurun. */
export function reachableCommits(state: RepoState, id: string): Commit[] {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop() as string;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...state.commits[cur].parents);
  }
  return [...seen].map((c) => state.commits[c]).sort((a, b) => b.seq - a.seq);
}

export const log: Handler = (state, args) => {
  const headId = getHeadCommitId(state);
  if (!headId) {
    const name = state.head.type === "branch" ? state.head.name : "HEAD";
    return failure(
      state,
      msg("log.noCommits"),
      `fatal: your current branch '${name}' does not have any commits yet`,
    );
  }
  const commits = reachableCommits(state, headId);
  const oneline = args.includes("--oneline");
  const out = commits.map((c) => (oneline ? `${c.id} ${c.message}` : `commit ${c.id}\n\n    ${c.message}\n`));
  return success(state, rawLines(out.join("\n").trimEnd()));
};
