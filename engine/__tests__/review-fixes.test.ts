import { describe, expect, it } from "vitest";
import { computeGraphLayout } from "../../ui/layout";
import { exec, initRepo, keys, paramsOf, rawText, run, write } from "./helpers";

describe("id commit unik", () => {
  it("commit identik di dua branch tidak saling menimpa dan graf tetap valid", () => {
    let s = run(run(write(initRepo(), "a", "1"), "git add ."), 'git commit -m "c1"');
    s = run(s, "git switch -c x");
    s = run(run(write(s, "b", "1"), "git add ."), 'git commit -m "same"');
    s = run(run(write(s, "c", "1"), "git add ."), 'git commit -m "child"');
    s = run(s, "git switch main");
    s = run(run(write(s, "b", "1"), "git add ."), 'git commit -m "same"');
    expect(Object.keys(s.commits)).toHaveLength(4);
    expect(new Set(Object.values(s.commits).map((c) => c.seq)).size).toBe(4);
    const layout = computeGraphLayout(s);
    for (const n of layout.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
    expect(Number.isFinite(layout.width)).toBe(true);
  });
});

describe("file tak terlacak tidak ditimpa diam-diam", () => {
  function withBranchTrackingN() {
    let s = run(run(write(initRepo(), "a", "1"), "git add ."), 'git commit -m "c1"');
    s = run(s, "git switch -c f");
    s = run(run(write(s, "n.txt", "theirs"), "git add ."), 'git commit -m "n di f"');
    s = run(s, "git switch main");
    return write(s, "n.txt", "MY WORK");
  }

  it("switch ditolak bila file tak terlacak akan tertimpa", () => {
    const s = withBranchTrackingN();
    const r = exec(s, "git switch f");
    expect(r.ok).toBe(false);
    expect(paramsOf(r, "untracked.switch")?.files).toBe("n.txt");
    expect(rawText(r)).toContain("untracked working tree files would be overwritten");
    expect(r.state.files["n.txt"]).toBe("MY WORK");
  });

  it("merge ditolak bila file tak terlacak akan tertimpa", () => {
    const s = withBranchTrackingN();
    const r = exec(s, "git merge f");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["untracked.merge"]);
    expect(rawText(r)).toContain("untracked working tree files would be overwritten");
    expect(r.state.files["n.txt"]).toBe("MY WORK");
  });

  it("file tak terlacak yang tidak bentrok tetap ikut pindah", () => {
    let s = withBranchTrackingN();
    s = write({ ...s, files: Object.fromEntries(Object.entries(s.files).filter(([k]) => k !== "n.txt")) }, "lain.txt", "x");
    const r = exec(s, "git switch f");
    expect(r.ok).toBe(true);
    expect(r.state.files["lain.txt"]).toBe("x");
  });
});
