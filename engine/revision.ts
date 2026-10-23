import { msg, type Msg } from "./messages";
import { hasOwn } from "./own";
import { getHeadCommitId } from "./state";
import type { RepoState } from "./types";

type Resolved = { id: string } | { error: Msg; git: string };

const unknownGit = (text: string) => `fatal: ambiguous argument '${text}': unknown revision or path not in the working tree.`;

const unknown = (text: string): Resolved => ({ error: msg("revision.unknown", { rev: text }), git: unknownGit(text) });

/** Nama polos -> id commit: branch lokal dulu, lalu `origin/<b>` bila ada di remoteRefs. */
export function resolveRef(state: RepoState, name: string): string | undefined {
  if (hasOwn(state.branches, name)) return state.branches[name] || undefined;
  if (name.startsWith("origin/")) {
    const b = name.slice("origin/".length);
    if (hasOwn(state.remoteRefs ?? {}, b)) return state.remoteRefs[b] || undefined;
  }
  return undefined;
}

/**
 * Terjemahkan teks revisi menjadi id commit.
 * Dikenal: nama branch, HEAD, HEAD~N (parent pertama), hash penuh / prefix unik >= 4 karakter.
 */
export function resolveRevision(state: RepoState, text: string): Resolved {
  const rev = text.trim();
  if (rev === "") return unknown(text);

  if (rev === "HEAD") {
    const id = getHeadCommitId(state);
    return id ? { id } : unknown(text);
  }

  const back = /^HEAD~(\d+)$/.exec(rev);
  if (back) {
    let id = getHeadCommitId(state);
    if (!id) return unknown(text);
    for (let n = Number(back[1]); n > 0; n--) {
      const parent: string | undefined = state.commits[id]?.parents[0];
      if (!parent) {
        return { error: msg("revision.tooFar", { rev: text }), git: unknownGit(text) };
      }
      id = parent;
    }
    return { id };
  }

  if (/[\^~@:]|\.\./.test(rev)) {
    return { error: msg("revision.unsupported", { rev: text }), git: `fatal: revision '${text}' is not supported here.` };
  }

  const refId = resolveRef(state, rev);
  if (refId) return { id: refId };

  if (/^[0-9a-f]+$/i.test(rev)) {
    const ambiguous = (): Resolved => ({
      error: msg("revision.ambiguous", { rev: text }),
      git: `error: short object ID ${text} is ambiguous`,
    });
    const lower = rev.toLowerCase();
    if (state.commits[lower]) return { id: lower };
    if (lower.length < 4) return ambiguous();
    const matches = Object.keys(state.commits).filter((id) => id.startsWith(lower));
    if (matches.length === 1) return { id: matches[0] };
    if (matches.length > 1) return ambiguous();
  }

  return unknown(text);
}
