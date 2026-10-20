import type { GitEvent } from "../engine/types";
import type { TMsg } from "../i18n/types";

function describe(e: GitEvent): TMsg {
  switch (e.type) {
    case "repo-dibuat":
      return { key: "caption.repoCreated" };
    case "file-di-stage":
      return { key: "caption.staged", params: { files: `\`${e.file}\`` } };
    case "commit-dibuat":
      return e.parents.length === 0
        ? { key: "caption.commitFirst", params: { id: e.id } }
        : { key: "caption.commit", params: { id: e.id, parent: e.parents[0] } };
    case "branch-dibuat":
      return { key: "caption.branchCreated", params: { name: e.name, at: e.at } };
    case "branch-dihapus":
      return { key: "caption.branchDeleted", params: { name: e.name } };
    case "branch-pindah":
      return { key: "caption.branchSwitched", params: { from: e.from, to: e.to } };
    case "head-pindah":
      return { key: "caption.headDetached", params: { id: e.id } };
    case "merge-fast-forward":
      return { key: "caption.fastForward", params: { branch: e.branch, to: e.to } };
    case "merge-commit-dibuat":
      return { key: "caption.mergeCommit", params: { id: e.id, p1: e.parents[0], p2: e.parents[1] } };
    case "konflik-terjadi":
      return { key: "caption.conflict", params: { files: e.files.map((f) => `\`${f}\``).join(", ") } };
    case "konflik-selesai":
      return { key: "caption.conflictResolved" };
    case "reset-dilakukan": {
      const key = { soft: "caption.resetSoft", mixed: "caption.resetMixed", hard: "caption.resetHard" } as const;
      return { key: key[e.mode], params: { from: e.from, to: e.to } };
    }
    case "revert-dibuat":
      return { key: "caption.revert", params: { id: e.id, reverted: e.reverted } };
    case "cherry-pick-dibuat":
      return { key: "caption.cherryPick", params: { id: e.id, source: e.source } };
    case "stash-disimpan":
      return { key: "caption.stashSaved", params: { files: e.files.map((f) => `\`${f}\``).join(", ") } };
    case "stash-dipulihkan":
      return { key: "caption.stashRestored", params: { files: e.files.map((f) => `\`${f}\``).join(", ") } };
    case "rebase-commit-disalin":
      return { key: "caption.rebaseCopied", params: { from: e.from, to: e.to } };
    case "rebase-selesai":
      return { key: "caption.rebaseDone", params: { branch: e.branch, tip: e.tip } };
    case "rebase-dibatalkan":
      return { key: "caption.rebaseAborted", params: { branch: e.branch } };
  }
}

/** Satu pesan penjelasan (berkunci) untuk hasil satu perintah, atau null bila tidak ada event. */
export function describeEvents(events: GitEvent[]): TMsg | null {
  if (events.length === 0) return null;
  const staged = events.filter((e) => e.type === "file-di-stage");
  if (staged.length === events.length && staged.length > 1) {
    const files = staged.map((e) => (e.type === "file-di-stage" ? `\`${e.file}\`` : "")).join(", ");
    return { key: "caption.staged", params: { files } };
  }
  const priority = ["rebase-selesai", "revert-dibuat", "cherry-pick-dibuat", "merge-commit-dibuat"] as const;
  for (const type of priority) {
    const found = events.find((e) => e.type === type);
    if (found) return describe(found);
  }
  return describe(events[events.length - 1]);
}
