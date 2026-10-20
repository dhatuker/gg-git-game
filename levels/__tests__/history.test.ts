import { describe, expect, it } from "vitest";
import { computeGraphLayout } from "../../ui/layout";
import { LEVELS } from "../index";
import { applySteps, commitCount } from "../solve";
import type { RepoState } from "../../engine/types";

const mergeCount = (s: RepoState) => Object.values(s.commits).filter((c) => c.parents.length > 1).length;

function noOverlap(s: RepoState) {
  const pos = computeGraphLayout(s).nodes.map((n) => `${n.x},${n.y}`);
  expect(new Set(pos).size).toBe(pos.length);
}

describe.each(LEVELS.slice(4).map((l) => [l.id, l] as const))("level %i: proyek yang sudah berjalan", (_id, level) => {
  it("punya riwayat panjang dengan beberapa merge", () => {
    expect(commitCount(level.initialState)).toBeGreaterThanOrEqual(12);
    expect(mergeCount(level.initialState)).toBeGreaterThanOrEqual(2);
  });

  it("branch tim yang sudah di-merge tidak menyisakan label", () => {
    for (const name of Object.keys(level.initialState.branches)) expect(["main", "feature", "hotfix", "experiment"]).toContain(name);
  });

  it("graf tidak punya node bertumpuk, sebelum maupun sesudah solusi", () => {
    noOverlap(level.initialState);
    noOverlap(applySteps(level.initialState, level.solution));
  });
});

describe("level 1–4 tetap dimulai dari nol", () => {
  it.each(LEVELS.slice(0, 4).map((l) => [l.id, l] as const))("level %i punya paling banyak 1 commit", (_id, level) => {
    expect(commitCount(level.initialState)).toBeLessThanOrEqual(1);
  });
});
