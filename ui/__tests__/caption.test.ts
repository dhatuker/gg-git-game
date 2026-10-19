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
  ];
  it.each(all.map((e) => [e.type, e] as const))("event %s menghasilkan kalimat", (_t, e) => {
    const m = describeEvents([e]);
    expect(m).not.toBeNull();
    expect(translate("id", m!.key, m!.params)).not.toMatch(/\{\w+\}/);
    expect(translate("en", m!.key, m!.params)).not.toMatch(/\{\w+\}/);
  });

  it("menggabungkan beberapa file yang di-stage", () => {
    const m = describeEvents([
      { type: "file-di-stage", file: "a.txt" },
      { type: "file-di-stage", file: "b.txt" },
    ]);
    expect(m).toEqual({ key: "caption.staged", params: { files: "`a.txt`, `b.txt`" } });
  });
});
