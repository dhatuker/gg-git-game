import {
  checkoutSnapshot,
  DIRTY_GIT,
  DIRTY_MESSAGE,
  failure,
  getHeadCommitId,
  hasUncommittedChanges,
  success,
  untrackedFailure,
  untrackedOverwritten,
} from "../state";
import type { CommandResult, Handler, RepoState } from "../types";
import { createBranch } from "./branch";

function moveTo(state: RepoState, target: string): CommandResult {
  const fromLabel = state.head.type === "branch" ? state.head.name : state.head.id;
  if (state.head.type === "branch" && state.head.name === target) {
    return success(state, `Sudah berada di branch \`${target}\`.\nAlready on '${target}'`, []);
  }
  const targetId = target in state.branches ? state.branches[target] : target in state.commits ? target : null;
  if (targetId) {
    const clobbered = untrackedOverwritten(state, state.commits[targetId].snapshot);
    if (clobbered.length) return untrackedFailure(state, clobbered, "pindah branch");
  }
  if (target in state.branches) {
    const id = state.branches[target];
    const next = { ...state, ...checkoutSnapshot(state, state.commits[id].snapshot), head: { type: "branch" as const, name: target } };
    return success(next, `HEAD sekarang menunjuk ke branch \`${target}\`.\nSwitched to branch '${target}'`, [
      { type: "branch-pindah", from: fromLabel, to: target },
    ]);
  }
  if (target in state.commits) {
    const next = { ...state, ...checkoutSnapshot(state, state.commits[target].snapshot), head: { type: "detached" as const, id: target } };
    return success(
      next,
      `HEAD sekarang menunjuk langsung ke commit ${target} (detached HEAD).\nHEAD is now at ${target} ${state.commits[target].message}`,
      [{ type: "head-pindah", id: target }],
    );
  }
  return failure(state, `Branch atau commit \`${target}\` tidak ditemukan.`, `fatal: invalid reference: ${target}`);
}

/** Dipakai oleh `switch` dan `checkout`. */
export const switchBranch: Handler = (state, args) => {
  const create = args[0] === "-c" || args[0] === "-b";
  const target = create ? args[1] : args[0];
  if (!target) {
    return failure(state, "Sebutkan branch tujuan, misalnya `git switch main`.", "fatal: missing branch or commit argument");
  }
  if (state.mergeState) {
    return failure(state, "Selesaikan merge yang sedang berlangsung dulu.", "fatal: You have not concluded your merge (MERGE_HEAD exists).");
  }
  if (create) {
    // Branch baru menunjuk ke commit yang sama, jadi perubahan yang belum di-commit ikut terbawa.
    const made = createBranch(state, target);
    if (!made.ok) return made;
    const from = state.head.type === "branch" ? state.head.name : state.head.id;
    return success(
      { ...made.state, head: { type: "branch", name: target } },
      `${made.output}\nHEAD sekarang menunjuk ke branch \`${target}\`.\nSwitched to a new branch '${target}'`,
      [...made.events, { type: "branch-pindah", from, to: target }],
    );
  }
  const alreadyThere = state.head.type === "branch" && state.head.name === target;
  if (!alreadyThere && hasUncommittedChanges(state)) return failure(state, DIRTY_MESSAGE, DIRTY_GIT);
  if (!getHeadCommitId(state) && !(target in state.branches)) {
    return failure(state, `Branch atau commit \`${target}\` tidak ditemukan.`, `fatal: invalid reference: ${target}`);
  }
  return moveTo(state, target);
};
