import { describe, expect, it } from "vitest";
import { createEmptyRepo } from "../../engine/state";
import type { GitEvent } from "../../engine/types";
import { columns, remoteSummary } from "../AreaPanel";
import { attachRemote, initRepo, run, teammateCommit, write } from "../../engine/__tests__/helpers";
import { litColumn } from "../highlight";

describe("columns", () => {
  it("satu chip per entri stash", () => {
    const repo = { ...createEmptyRepo(), stash: [{ files: {}, index: {}, baseCommit: null }] };
    expect(columns(repo).stash).toEqual([{ file: "stash@{0}" }]);
  });
  it("stash kosong menghasilkan []", () => {
    expect(columns(createEmptyRepo()).stash).toEqual([]);
  });
  it("file konflik rebase berstatus konflik di kolom working", () => {
    const repo = {
      ...createEmptyRepo({ "a.txt": "x" }),
      rebaseState: { branch: "fitur", onto: "c1", originalTip: "c2", current: "c3", remaining: [], conflicts: ["a.txt"] },
    };
    expect(columns(repo).working).toEqual([{ file: "a.txt", note: "konflik" }]);
  });
});

describe("litColumn", () => {
  const reset = (mode: "soft" | "mixed" | "hard"): GitEvent => ({ type: "reset-dilakukan", mode, from: "a", to: "b" });
  it.each([
    [reset("soft"), "staging"],
    [reset("mixed"), "working"],
    [reset("hard"), null],
    [{ type: "stash-disimpan", files: [] } as GitEvent, "stash"],
    [{ type: "stash-dipulihkan", files: [] } as GitEvent, "working"],
    [{ type: "file-di-stage", file: "a" } as GitEvent, "staging"],
    [{ type: "konflik-terjadi", files: [] } as GitEvent, "working"],
    [{ type: "push-berhasil", from: "a", to: "b", count: 1 } as GitEvent, "remote"],
    [{ type: "fetch-selesai", from: "a", to: "b" } as GitEvent, "repo"],
    [{ type: "clone-selesai", tip: "a" } as GitEvent, "repo"],
    [null, null],
  ])("%j", (e, expected) => {
    expect(litColumn(e)).toBe(expected);
  });
});

function connected() {
  let s = write(initRepo(), "a.txt", "1");
  s = run(run(s, "git add ."), 'git commit -m "satu"');
  return attachRemote(s);
}

describe("columns remote", () => {
  it("kosong tanpa remote terhubung", () => {
    expect(columns(createEmptyRepo()).remote).toEqual([]);
    expect(columns(initRepo()).remote).toEqual([]);
  });
  it("satu chip origin/main bila terhubung", () => {
    expect(columns(connected()).remote).toEqual([{ file: "origin/main" }]);
  });
});

describe("remoteSummary", () => {
  it("null bila tak terhubung", () => {
    expect(remoteSummary(initRepo())).toBeNull();
  });
  it("sinkron", () => {
    const s = connected();
    const r = remoteSummary(s)!;
    expect(r.ahead).toBe(0);
    expect(r.behind).toBe(0);
    expect(r.tip.id).toBe(s.branches.main);
    expect(r.tip.message).toBe("satu");
  });
  it("lokal ahead 1", () => {
    let s = connected();
    s = run(run(write(s, "b.txt", "2"), "git add ."), 'git commit -m "dua"');
    const r = remoteSummary(s)!;
    expect([r.ahead, r.behind]).toEqual([1, 0]);
  });
  it("behind 2 setelah teman commit dua kali tanpa fetch", () => {
    let s = connected();
    s = teammateCommit(s, "t.txt", "1", "teman satu");
    s = teammateCommit(s, "t.txt", "2", "teman dua");
    const r = remoteSummary(s)!;
    expect([r.ahead, r.behind]).toEqual([0, 2]);
    expect(r.tip.message).toBe("teman dua");
    expect(s.remoteRefs.main).not.toBe(s.remote!.branches.main);
  });
});
