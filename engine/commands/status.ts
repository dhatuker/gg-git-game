import { msg, raw, type MessageKey, type OutputLine } from "../messages";
import { activeConflicts, headSnapshot, success } from "../state";
import type { Handler } from "../types";

export const status: Handler = (state) => {
  const head = headSnapshot(state);
  const staged = Object.keys(state.index).filter((p) => state.index[p] !== head[p]);
  const unstaged = Object.keys(state.index).filter((p) => p in state.files && state.files[p] !== state.index[p]);
  const untracked = Object.keys(state.files).filter((p) => !(p in state.index));
  const lines: OutputLine[] = [
    state.head.type === "branch" ? msg("status.onBranch", { branch: state.head.name }) : msg("status.detached", { id: state.head.id }),
  ];
  if (state.rebaseState) lines.push(msg("status.rebaseInProgress", { branch: state.rebaseState.branch }));
  const headerLines = lines.length;
  const section = (title: MessageKey, paths: string[]) => {
    if (paths.length === 0) return;
    lines.push(raw(""), msg(title), ...paths.sort().map((p) => raw(`    ${p}`)));
  };
  section("status.conflicts", [...activeConflicts(state)]);
  section("status.staged", staged);
  section("status.unstaged", unstaged);
  section("status.untracked", untracked);
  if (lines.length === headerLines) lines.push(raw(""), msg("status.clean"), raw("nothing to commit, working tree clean"));
  return success(state, lines);
};
