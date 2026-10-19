import { describe, expect, it } from "vitest";
import { runCommand } from "../../engine";
import { writeFile } from "../../engine/files";
import { createEmptyRepo } from "../../engine/state";
import type { RepoState } from "../../engine/types";
import { graphGeometry, scrollLeftFor } from "../graph-geometry";
import { computeGraphLayout } from "../layout";

function run(s: RepoState, input: string): RepoState {
  const r = runCommand(s, input);
  if (!r.ok) throw new Error(JSON.stringify(r.output));
  return r.state;
}
function commitFile(s: RepoState, file: string, content: string, msg: string): RepoState {
  return run(run(writeFile(s, file, content).state, "git add ."), `git commit -m "${msg}"`);
}

/** Posisi y paling atas dari setiap tumpukan label harus tetap di dalam kanvas SVG. */
function topmostLabelY(s: RepoState): number {
  const layout = computeGraphLayout(s);
  const g = graphGeometry(layout);
  let min = Infinity;
  for (const [commitId, names] of g.stacks) {
    const node = layout.nodes.find((n) => n.id === commitId)!;
    min = Math.min(min, g.labelY(node, names.length - 1));
  }
  return min;
}

describe("graphGeometry", () => {
  it("tiga label (HEAD, main, fitur) di satu commit tidak terpotong di atas kanvas", () => {
    let s = commitFile(run(createEmptyRepo(), "git init"), "a", "1", "satu");
    s = run(s, "git switch -c fitur");
    s = commitFile(s, "b", "1", "di fitur");
    s = run(s, "git switch main");
    s = run(s, "git merge fitur");
    expect(topmostLabelY(s)).toBeGreaterThanOrEqual(0);
  });

  it("empat label di satu commit juga tetap di dalam kanvas", () => {
    let s = commitFile(run(createEmptyRepo(), "git init"), "a", "1", "satu");
    s = run(run(s, "git branch fitur"), "git branch perbaikan");
    expect(topmostLabelY(s)).toBeGreaterThanOrEqual(0);
  });

  it("tinggi kanvas memuat node paling bawah beserta id-nya", () => {
    let s = commitFile(run(createEmptyRepo(), "git init"), "a", "1", "satu");
    s = run(s, "git switch -c fitur");
    s = commitFile(s, "b", "1", "di fitur");
    const layout = computeGraphLayout(s);
    const g = graphGeometry(layout);
    const lowest = Math.max(...layout.nodes.map((n) => g.py(n)));
    expect(g.height).toBeGreaterThanOrEqual(lowest + 36);
  });
});

describe("scrollLeftFor", () => {
  it("menaruh HEAD di sekitar 60% lebar area yang terlihat", () => {
    expect(scrollLeftFor(1500, 500, 2000)).toBe(1200);
  });

  it("tidak menggulir saat HEAD sudah terlihat di awal", () => {
    expect(scrollLeftFor(100, 500, 2000)).toBe(0);
  });

  it("tidak melewati ujung kanan konten", () => {
    expect(scrollLeftFor(1990, 500, 2000)).toBe(1500);
  });

  it("konten lebih sempit dari area → 0", () => {
    expect(scrollLeftFor(200, 800, 400)).toBe(0);
  });
});
