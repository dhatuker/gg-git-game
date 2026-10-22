import { msg, raw } from "../messages";
import {
  checkoutSnapshot,
  DIRTY_GIT,
  DIRTY_MESSAGE,
  failure,
  getHeadCommitId,
  hasUncommittedChanges,
  inProgressBlock,
  success,
  untrackedFailure,
  untrackedOverwritten,
} from "../state";
import type { CommandResult, Handler, RepoState } from "../types";
import { resolveRevision } from "../revision";
import { createBranch } from "./branch";

function moveTo(state: RepoState, target: string): CommandResult {
  const fromLabel = state.head.type === "branch" ? state.head.name : state.head.id;
  if (state.head.type === "branch" && state.head.name === target) {
    return success(state, [msg("switch.alreadyOn", { branch: target }), raw(`Already on '${target}'`)], []);
  }
  const targetId = target in state.branches ? state.branches[target] : target in state.commits ? target : null;
  if (targetId) {
    const clobbered = untrackedOverwritten(state, state.commits[targetId].snapshot);
    if (clobbered.length) return untrackedFailure(state, clobbered, "switch");
  }
  if (target in state.branches) {
    const id = state.branches[target];
    const next = { ...state, ...checkoutSnapshot(state, state.commits[id].snapshot), head: { type: "branch" as const, name: target } };
    return success(next, [msg("switch.switched", { branch: target }), raw(`Switched to branch '${target}'`)], [
      { type: "branch-pindah", from: fromLabel, to: target },
    ]);
  }
  if (target in state.commits) {
    const next = { ...state, ...checkoutSnapshot(state, state.commits[target].snapshot), head: { type: "detached" as const, id: target } };
    return success(
      next,
      [msg("switch.detached", { id: target }), raw(`HEAD is now at ${target} ${state.commits[target].message}`)],
      [{ type: "head-pindah", id: target }],
    );
  }
  return failure(state, msg("switch.notFound", { target }), `fatal: invalid reference: ${target}`);
}

/** Label posisi HEAD: nama branch, atau id commit bila detached. */
const headLabel = (state: RepoState) => (state.head.type === "branch" ? state.head.name : state.head.id);

/** Catat posisi lama untuk `git switch -` bila HEAD benar-benar berpindah. */
function remember(before: RepoState, r: CommandResult): CommandResult {
  if (!r.ok || headLabel(r.state) === headLabel(before)) return r;
  return { ...r, state: { ...r.state, previousHead: headLabel(before) } };
}

/** Dipakai oleh `switch` dan `checkout`. */
export const switchBranch: Handler = (state, args) => {
  const blocked = state.rebaseState && inProgressBlock(state);
  if (blocked) return blocked;
  const create = args[0] === "-c" || args[0] === "-b";
  let target = create ? args[1] : args[0];
  if (!target) {
    return failure(state, msg("switch.needTarget"), "fatal: missing branch or commit argument");
  }
  if (state.mergeState) {
    return failure(state, msg("switch.mergeInProgress"), "fatal: You have not concluded your merge (MERGE_HEAD exists).");
  }
  if (create) return remember(state, createAndSwitch(state, target, args[2]));
  if (target === "-") {
    if (!state.previousHead) return failure(state, msg("switch.noPrevious"), "fatal: invalid reference: @{-1}");
    target = state.previousHead;
  }
  const alreadyThere = state.head.type === "branch" && state.head.name === target;
  if (!alreadyThere && hasUncommittedChanges(state)) return failure(state, DIRTY_MESSAGE, DIRTY_GIT);
  if (!getHeadCommitId(state) && !(target in state.branches)) {
    return failure(state, msg("switch.notFound", { target }), `fatal: invalid reference: ${target}`);
  }
  return remember(state, moveTo(state, target));
};

/** `switch -c <nama> [titik-awal]`: tanpa titik awal, perubahan yang belum di-commit ikut terbawa. */
function createAndSwitch(state: RepoState, name: string, startText: string | undefined): CommandResult {
  const headId = getHeadCommitId(state);
  let at = headId ?? undefined;
  if (startText !== undefined) {
    const start = resolveRevision(state, startText);
    if ("error" in start) return failure(state, start.error, start.git);
    at = start.id;
  }
  const made = createBranch(state, name, at);
  if (!made.ok) return made;
  const from = headLabel(state);
  const output = [...made.output, msg("switch.switched", { branch: name }), raw(`Switched to a new branch '${name}'`)];
  const events = [...made.events, { type: "branch-pindah" as const, from, to: name }];
  if (at === headId) return success({ ...made.state, head: { type: "branch", name } }, output, events);
  // Titik awal lain: working directory diganti isi commit itu, jadi harus bersih dulu.
  if (hasUncommittedChanges(state)) return failure(state, DIRTY_MESSAGE, DIRTY_GIT);
  const snapshot = state.commits[at as string].snapshot;
  const clobbered = untrackedOverwritten(state, snapshot);
  if (clobbered.length) return untrackedFailure(state, clobbered, "switch");
  return success({ ...made.state, ...checkoutSnapshot(state, snapshot), head: { type: "branch", name } }, output, events);
}
