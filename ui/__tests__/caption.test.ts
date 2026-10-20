import { describe, expect, it } from "vitest";
import type { GitEvent } from "../../engine/types";
import { translate } from "../../i18n";
import { describeEvents } from "../caption";

describe("describeEvents", () => {
  it("menjelaskan fast-forward dengan kunci dan kalimat yang dipatok spec", () => {
    const m = describeEvents([{ type: "merge-fast-forward", branch: "main", to: "a3f9c1e" }]);
    expect(m).toEqual({ key: "caption.fastForward", params: { branch: "main", to: "a3f9c1e" } });
    expect(translate("id", m!.key, m!.params)).toBe("Pointer `main` maju ke commit `a3f9c1e`. Tidak ada commit baru yang dibuat.");
    expect(translate("en", m!.key, m!.params)).toContain("a3f9c1e");
  });

  it("daftar kosong menghasilkan null", () => {
    expect(describeEvents([])).toBeNull();
  });

  const all: GitEvent[] = [
    { type: "repo-dibuat" },
    { type: "file-di-stage", file: "a.txt" },
    { type: "commit-dibuat", id: "abc1234", parents: [] },
    { type: "branch-dibuat", name: "fitur", at: "abc1234" },
    { type: "branch-dihapus", name: "fitur" },
    { type: "branch-pindah", from: "main", to: "fitur" },
    { type: "head-pindah", id: "abc1234" },
    { type: "merge-commit-dibuat", id: "abc1234", parents: ["a", "b"] },
    { type: "konflik-terjadi", files: ["a.txt"] },
    { type: "konflik-selesai" },
    { type: "reset-dilakukan", mode: "soft", from: "a", to: "b" },
    { type: "reset-dilakukan", mode: "mixed", from: "a", to: "b" },
    { type: "reset-dilakukan", mode: "hard", from: "a", to: "b" },
    { type: "revert-dibuat", id: "r1", reverted: "c1" },
    { type: "cherry-pick-dibuat", id: "p1", source: "c1" },
    { type: "stash-disimpan", files: ["a.txt", "b.txt"] },
    { type: "stash-dipulihkan", files: ["a.txt"] },
    { type: "rebase-commit-disalin", from: "a", to: "b" },
    { type: "rebase-selesai", branch: "fitur", tip: "t1" },
    { type: "rebase-dibatalkan", branch: "fitur" },
    { type: "clone-selesai", tip: "abc1234" },
    { type: "fetch-selesai", from: "a1", to: "b2" },
    { type: "push-berhasil", from: "a1", to: "b2", count: 2 },
  ];
  it.each(all.map((e) => [e.type, e] as const))("event %s menghasilkan kalimat", (_t, e) => {
    const m = describeEvents([e]);
    expect(m).not.toBeNull();
    expect(translate("id", m!.key, m!.params)).not.toMatch(/\{\w+\}/);
    expect(translate("en", m!.key, m!.params)).not.toMatch(/\{\w+\}/);
  });

  it("fetch dan push memakai kunci masing-masing", () => {
    expect(describeEvents([{ type: "fetch-selesai", from: "a1", to: "b2" }])).toEqual({ key: "caption.fetch", params: { from: "a1", to: "b2" } });
    expect(describeEvents([{ type: "push-berhasil", from: "a1", to: "b2", count: 2 }])).toEqual({ key: "caption.push", params: { count: 2, to: "b2" } });
  });
  it("clone-selesai memakai caption.clone dengan tip", () => {
    const m = describeEvents([{ type: "clone-selesai", tip: "abc1234" }]);
    expect(m).toEqual({ key: "caption.clone", params: { tip: "abc1234" } });
    expect(translate("id", m!.key, m!.params)).toContain("abc1234");
    expect(translate("en", m!.key, m!.params)).toContain("abc1234");
  });

  it("menggabungkan beberapa file yang di-stage", () => {
    const m = describeEvents([
      { type: "file-di-stage", file: "a.txt" },
      { type: "file-di-stage", file: "b.txt" },
    ]);
    expect(m).toEqual({ key: "caption.staged", params: { files: "`a.txt`, `b.txt`" } });
  });

  it.each(["soft", "mixed", "hard"] as const)("reset %s memilih kunci per mode", (mode) => {
    const m = describeEvents([{ type: "reset-dilakukan", mode, from: "a", to: "b" }]);
    const key = { soft: "caption.resetSoft", mixed: "caption.resetMixed", hard: "caption.resetHard" }[mode];
    expect(m).toEqual({ key, params: { from: "a", to: "b" } });
  });

  it.each(["soft", "mixed", "hard"] as const)("reset %s tanpa pindah memakai kunci Stay", (mode) => {
    const m = describeEvents([{ type: "reset-dilakukan", mode, from: "a", to: "a" }]);
    const key = { soft: "caption.resetSoftStay", mixed: "caption.resetMixedStay", hard: "caption.resetHardStay" }[mode];
    expect(m).toEqual({ key, params: { to: "a" } });
  });

  it("revert, cherry-pick, dan rebase-selesai diprioritaskan atas event lain", () => {
    const commit: GitEvent = { type: "commit-dibuat", id: "x", parents: ["p"] };
    expect(describeEvents([commit, { type: "revert-dibuat", id: "x", reverted: "c" }])).toEqual({
      key: "caption.revert",
      params: { id: "x", reverted: "c" },
    });
    expect(describeEvents([commit, { type: "cherry-pick-dibuat", id: "x", source: "c" }])).toEqual({
      key: "caption.cherryPick",
      params: { id: "x", source: "c" },
    });
    expect(
      describeEvents([
        { type: "rebase-commit-disalin", from: "a", to: "b" },
        { type: "rebase-commit-disalin", from: "c", to: "d" },
        { type: "rebase-selesai", branch: "fitur", tip: "d" },
      ]),
    ).toEqual({ key: "caption.rebaseDone", params: { branch: "fitur", tip: "d" } });
  });

  it("push-berhasil dan clone-selesai tidak kalah oleh commit-dibuat", () => {
    const commit: GitEvent = { type: "commit-dibuat", id: "x", parents: ["p"] };
    expect(describeEvents([commit, { type: "push-berhasil", from: "a", to: "b", count: 1 }])?.key).toBe("caption.push");
    expect(describeEvents([commit, { type: "clone-selesai", tip: "x" }])?.key).toBe("caption.clone");
  });
});
