import { describe, expect, it } from "vitest";
import { resolveRevision } from "../revision";
import { createEmptyRepo } from "../state";
import type { RepoState } from "../types";
import { initRepo, run, write } from "./helpers";

function commitFile(state: RepoState, content: string, message: string): RepoState {
  return run(run(write(state, "a.txt", content), "git add ."), `git commit -m "${message}"`);
}

function linear(): { state: RepoState; ids: string[] } {
  let s = initRepo();
  const ids: string[] = [];
  for (let i = 1; i <= 4; i++) {
    s = commitFile(s, `v${i}`, `c${i}`);
    ids.push((s.branches.main as string));
  }
  return { state: s, ids };
}

describe("resolveRevision", () => {
  const { state, ids } = linear();

  it("HEAD dan HEAD~N", () => {
    expect(resolveRevision(state, "HEAD")).toEqual({ id: ids[3] });
    expect(resolveRevision(state, "HEAD~0")).toEqual({ id: ids[3] });
    expect(resolveRevision(state, "HEAD~2")).toEqual({ id: ids[1] });
    expect(resolveRevision(state, "HEAD~3")).toEqual({ id: ids[0] });
  });

  it("nama branch, hash penuh, dan prefix unik", () => {
    expect(resolveRevision(state, "main")).toEqual({ id: ids[3] });
    expect(resolveRevision(state, ids[1])).toEqual({ id: ids[1] });
    expect(resolveRevision(state, ids[2].slice(0, 4))).toEqual({ id: ids[2] });
  });

  it("HEAD~N terlalu jauh", () => {
    const r = resolveRevision(state, "HEAD~99");
    expect("error" in r && r.error.key).toBe("revision.tooFar");
    expect("error" in r && r.error.params).toEqual({ rev: "HEAD~99" });
  });

  it("prefix terlalu pendek atau cocok banyak commit -> ambiguous", () => {
    const short = resolveRevision(state, ids[0].slice(0, 3));
    expect("error" in short && short.error.key).toBe("revision.ambiguous");
    const s: RepoState = {
      ...state,
      commits: {
        ...state.commits,
        abcd111: { ...state.commits[ids[0]], id: "abcd111" },
        abcd222: { ...state.commits[ids[0]], id: "abcd222" },
      },
    };
    const r = resolveRevision(s, "abcd");
    expect("error" in r && r.error.key).toBe("revision.ambiguous");
    expect(resolveRevision(s, "abcd1")).toEqual({ id: "abcd111" });
  });

  it("bentuk yang belum didukung", () => {
    for (const t of ["HEAD^", "main..HEAD", "@", "HEAD~x", "HEAD~"]) {
      const r = resolveRevision(state, t);
      expect("error" in r && r.error.key).toBe("revision.unsupported");
      expect("error" in r && r.error.params).toEqual({ rev: t });
    }
  });

  it("teks acak -> unknown dengan pesan git", () => {
    const r = resolveRevision(state, "x");
    expect("error" in r && r.error.key).toBe("revision.unknown");
    expect("git" in r && r.git).toBe("fatal: ambiguous argument 'x': unknown revision or path not in the working tree.");
  });

  it("repo tanpa commit dengan HEAD -> unknown", () => {
    for (const s of [initRepo(), createEmptyRepo()]) {
      const r = resolveRevision(s, "HEAD");
      expect("error" in r && r.error.key).toBe("revision.unknown");
    }
  });
});
