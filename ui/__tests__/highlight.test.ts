import { describe, expect, it } from "vitest";
import type { GitEvent } from "../../engine/types";
import { highlightTargets } from "../highlight";

const cases: [GitEvent, ReturnType<typeof highlightTargets>][] = [
  [{ type: "reset-dilakukan", mode: "hard", from: "a", to: "b" }, { commits: ["b"], labels: ["HEAD"], files: [] }],
  [{ type: "revert-dibuat", id: "r1", reverted: "c1" }, { commits: ["r1"], labels: [], files: [] }],
  [{ type: "cherry-pick-dibuat", id: "p1", source: "c1" }, { commits: ["p1"], labels: [], files: [] }],
  [{ type: "stash-disimpan", files: ["a.txt"] }, { commits: [], labels: [], files: ["a.txt"] }],
  [{ type: "stash-dipulihkan", files: ["a.txt", "b.txt"] }, { commits: [], labels: [], files: ["a.txt", "b.txt"] }],
  [{ type: "rebase-commit-disalin", from: "a", to: "b" }, { commits: ["b"], labels: [], files: [] }],
  [{ type: "rebase-selesai", branch: "fitur", tip: "t1" }, { commits: ["t1"], labels: ["fitur"], files: [] }],
  [{ type: "rebase-dibatalkan", branch: "fitur" }, { commits: [], labels: [], files: [] }],
];

describe("highlightTargets (v2a)", () => {
  it.each(cases.map((c) => [c[0].type, c[0], c[1]] as const))("event %s", (_t, e, expected) => {
    expect(highlightTargets(e, {})).toEqual(expected);
  });
});
