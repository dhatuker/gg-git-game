import { describe, expect, it } from "vitest";
import { resolveRef, resolveRevision } from "../revision";
import { createEmptyRepo } from "../state";
import type { RepoState } from "../types";
import { attachRemote, initRepo, run, teammateCommit, write } from "./helpers";

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

describe("resolveRevision dengan remote", () => {
  const s = teammateCommit(attachRemote(linear().state), "z.txt", "z", "teman");
  const old = linear();

  it("origin/main -> ujung remoteRefs.main", () => {
    const r = attachRemote(old.state);
    expect(resolveRevision(r, "origin/main")).toEqual({ id: r.remoteRefs.main });
    expect(s.remoteRefs.main).toBe(old.ids[3]);
  });

  it("branch lokal origin/x menang atas remote", () => {
    const r = { ...attachRemote(old.state), branches: { ...old.state.branches, "origin/main": old.ids[0] } };
    expect(resolveRevision(r, "origin/main")).toEqual({ id: old.ids[0] });
  });

  it("origin/missing -> unknown", () => {
    const r = resolveRevision(attachRemote(old.state), "origin/missing");
    expect("error" in r && r.error.key).toBe("revision.unknown");
  });
});

describe("resolveRef", () => {
  it("lokal dulu, lalu origin/<b>, selain itu undefined", () => {
    const r = attachRemote(linear().state);
    expect(resolveRef(r, "main")).toBe(r.branches.main);
    expect(resolveRef(r, "origin/main")).toBe(r.remoteRefs.main);
    expect(resolveRef(r, "origin/nope")).toBeUndefined();
    expect(resolveRef(r, "origin/main~1")).toBeUndefined();
  });
});
