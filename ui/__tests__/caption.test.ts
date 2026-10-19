import { describe, expect, it } from "vitest";
import type { GitEvent } from "../../engine/types";
import { describeEvents } from "../caption";

describe("describeEvents", () => {
  it("menjelaskan fast-forward dengan kalimat yang dipatok spec", () => {
    expect(describeEvents([{ type: "merge-fast-forward", branch: "main", to: "a3f9c1e" }])).toBe(
      "Pointer `main` maju ke commit `a3f9c1e`. Tidak ada commit baru yang dibuat.",
    );
  });

  it("daftar kosong menghasilkan string kosong", () => {
    expect(describeEvents([])).toBe("");
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
    expect(describeEvents([e]).length).toBeGreaterThan(0);
  });

  it("menggabungkan beberapa file yang di-stage", () => {
    const text = describeEvents([
      { type: "file-di-stage", file: "a.txt" },
      { type: "file-di-stage", file: "b.txt" },
    ]);
    expect(text).toContain("a.txt");
    expect(text).toContain("b.txt");
  });
});
