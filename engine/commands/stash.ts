import { msg, raw } from "../messages";
import { checkoutSnapshot, failure, getHeadCommitId, headSnapshot, inProgressBlock, success } from "../state";
import type { Files, Handler, RepoState, StashEntry } from "../types";

/** Path yang terlacak (ada di HEAD atau index), terurut. */
function trackedPaths(state: RepoState, head: Files): string[] {
  return [...new Set([...Object.keys(head), ...Object.keys(state.index)])].sort();
}

/** git stash [push] | pop | list */
export const stash: Handler = (state, args) => {
  const sub = args[0] ?? "push";
  if (sub !== "push" && sub !== "pop" && sub !== "list") {
    return failure(state, msg("stash.unsupported", { sub }), `error: unknown subcommand: ${sub}`);
  }
  const blocked = inProgressBlock(state);
  if (blocked) return blocked;

  if (sub === "list") {
    if (!state.stash.length) return success(state, [msg("stash.noneYet")]);
    const label = state.head.type === "branch" ? state.head.name : "HEAD";
    return success(
      state,
      state.stash.map((e, i) => {
        const id = e.baseCommit as string;
        return raw(`stash@{${i}}: WIP on ${label}: ${id} ${state.commits[id]?.message ?? ""}`);
      }),
    );
  }

  const head = headSnapshot(state);

  if (sub === "push") {
    const headId = getHeadCommitId(state);
    if (!headId) return failure(state, msg("stash.noCommits"), "You do not have the initial commit yet");
    const tracked = trackedPaths(state, head);
    const changed = tracked.filter((p) => head[p] !== state.index[p] || state.files[p] !== state.index[p]);
    if (!changed.length) return failure(state, msg("stash.nothing"), "No local changes to save");
    const trackedFiles: Files = {};
    for (const p of tracked) if (p in state.files) trackedFiles[p] = state.files[p];
    const entry: StashEntry = { files: trackedFiles, index: { ...state.index }, baseCommit: headId };
    // Bersihkan file terlacak dari working directory dulu, lalu pulihkan ke HEAD (file tak terlacak tetap).
    const untracked: Files = {};
    for (const [p, c] of Object.entries(state.files)) if (!tracked.includes(p)) untracked[p] = c;
    const next: RepoState = {
      ...state,
      ...checkoutSnapshot({ ...state, files: untracked, index: {} }, head),
      stash: [entry, ...state.stash],
    };
    return success(next, [msg("stash.saved", { files: changed.join(", ") })], [{ type: "stash-disimpan", files: changed }]);
  }

  // pop
  const entry = state.stash[0];
  if (!entry) return failure(state, msg("stash.empty"), "No stash entries found.");
  const baseSnap = (entry.baseCommit && state.commits[entry.baseCommit]?.snapshot) || {};
  const paths = [...new Set([...Object.keys(baseSnap), ...Object.keys(entry.index), ...Object.keys(entry.files)])].sort();
  const changed = paths.filter((p) => entry.files[p] !== baseSnap[p] || entry.index[p] !== baseSnap[p]);
  // Tolak bila working directory kotor, atau branch sekarang punya versi lain dari dasar stash (akan tertimpa).
  const conflicts = changed.filter((p) => state.files[p] !== head[p] || head[p] !== baseSnap[p]);
  if (conflicts.length) {
    return failure(
      state,
      msg("stash.conflict", { files: conflicts.join(", ") }),
      `error: Your local changes to the following files would be overwritten by merge:\n${conflicts.map((p) => `\t${p}`).join("\n")}`,
    );
  }
  const files: Files = { ...state.files };
  for (const p of changed) {
    if (p in entry.files) files[p] = entry.files[p];
    else delete files[p];
  }
  return success(
    { ...state, files, stash: state.stash.slice(1) },
    [msg("stash.popped", { files: changed.join(", ") })],
    [{ type: "stash-dipulihkan", files: changed }],
  );
};
