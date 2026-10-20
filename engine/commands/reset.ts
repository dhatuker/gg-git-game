import { msg, raw, type OutputLine } from "../messages";
import { resolveRevision } from "../revision";
import {
  checkoutSnapshot,
  failure,
  getHeadCommitId,
  inProgressBlock,
  success,
  untrackedFailure,
  untrackedOverwritten,
} from "../state";
import type { Handler, RepoState } from "../types";

type Mode = "soft" | "mixed" | "hard";

/** git reset [--soft|--mixed|--hard] [<rev>] */
export const reset: Handler = (state, args) => {
  const blocked = inProgressBlock(state);
  if (blocked) return blocked;

  let mode: Mode = "mixed";
  let rev = "HEAD";
  let sawRev = false;
  for (const arg of args) {
    if (arg === "--soft" || arg === "--mixed" || arg === "--hard") {
      mode = arg.slice(2) as Mode;
    } else if (arg.startsWith("-")) {
      return failure(state, msg("reset.badFlag", { flag: arg }), `error: unknown option '${arg.replace(/^-+/, "")}'`);
    } else if (!sawRev) {
      rev = arg;
      sawRev = true;
    }
  }

  const from = getHeadCommitId(state);
  if (!from) return failure(state, msg("reset.noCommits"), "fatal: Failed to resolve 'HEAD' as a valid ref.");

  const resolved = resolveRevision(state, rev);
  if ("error" in resolved) return failure(state, resolved.error, resolved.git);
  const to = resolved.id;
  const snapshot = state.commits[to].snapshot;

  let next: RepoState = state;
  if (mode === "mixed") next = { ...state, index: { ...snapshot } };
  if (mode === "hard") {
    const clobbered = untrackedOverwritten(state, snapshot);
    if (clobbered.length) return untrackedFailure(state, clobbered, "switch");
    next = { ...state, ...checkoutSnapshot(state, snapshot) };
  }
  next =
    state.head.type === "branch"
      ? { ...next, branches: { ...next.branches, [state.head.name]: to } }
      : { ...next, head: { type: "detached", id: to } };

  const output: OutputLine[] = [msg(`reset.${mode}`, { to })];
  if (mode === "hard") output.push(raw(`HEAD is now at ${to} ${state.commits[to].message}`));
  return success(next, output, [{ type: "reset-dilakukan", mode, from, to }]);
};
