import { describe, expect, it } from "vitest";
import { createEmptyRepo } from "../../engine/state";
import type { GitEvent } from "../../engine/types";
import { columns } from "../AreaPanel";
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
    [null, null],
  ])("%j", (e, expected) => {
    expect(litColumn(e)).toBe(expected);
  });
});
