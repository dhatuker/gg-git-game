import { describe, expect, it } from "vitest";
import { runCommand } from "../../engine";
import { writeFile } from "../../engine/files";
import { createEmptyRepo } from "../../engine/state";
import type { RepoState } from "../../engine/types";
import { computeGraphLayout } from "../layout";

function run(s: RepoState, input: string): RepoState {
  const r = runCommand(s, input);
  if (!r.ok) throw new Error(JSON.stringify(r.output));
  return r.state;
}
function commitFile(s: RepoState, file: string, content: string, msg: string): RepoState {
  return run(run(writeFile(s, file, content).state, "git add ."), `git commit -m "${msg}"`);
}
const init = () => run(createEmptyRepo(), "git init");

describe("computeGraphLayout", () => {
  it("repo tanpa commit menghasilkan graf kosong", () => {
    const l = computeGraphLayout(init());
    expect(l.nodes).toEqual([]);
    expect(l.edges).toEqual([]);
    expect(l.labels).toEqual([]);
  });

  it("rantai di main berada di satu baris dengan x naik 80", () => {
    let s = commitFile(init(), "a", "1", "satu");
    s = commitFile(s, "a", "2", "dua");
    s = commitFile(s, "a", "3", "tiga");
    const l = computeGraphLayout(s);
    const sorted = [...l.nodes].sort((a, b) => a.x - b.x);
    expect(sorted.map((n) => n.x)).toEqual([40, 120, 200]);
    expect(new Set(sorted.map((n) => n.y))).toEqual(new Set([40]));
    expect(l.edges).toHaveLength(2);
  });

  it("commit di branch lain berada di baris berbeda", () => {
    let s = commitFile(init(), "a", "1", "satu");
    s = run(s, "git switch -c fitur");
    s = commitFile(s, "b", "1", "di fitur");
    const l = computeGraphLayout(s);
    const fiturNode = l.nodes.find((n) => n.id === s.branches.fitur)!;
    const mainNode = l.nodes.find((n) => n.id === s.branches.main)!;
    expect(fiturNode.y).toBe(100);
    expect(mainNode.y).toBe(40);
    expect(fiturNode.lane).toBe(1);
  });

  it("merge commit punya dua edge", () => {
    let s = commitFile(init(), "a", "1", "satu");
    s = run(s, "git switch -c fitur");
    s = commitFile(s, "b", "1", "fitur");
    s = run(s, "git switch main");
    s = commitFile(s, "c", "1", "main");
    s = run(s, "git merge fitur");
    const l = computeGraphLayout(s);
    expect(l.edges.filter((e) => e.from === s.branches.main)).toHaveLength(2);
  });

  it("label head menempel pada commit branch aktif, label branch untuk setiap branch", () => {
    let s = commitFile(init(), "a", "1", "satu");
    s = run(s, "git branch fitur");
    const l = computeGraphLayout(s);
    expect(l.labels).toContainEqual({ name: "HEAD", kind: "head", commitId: s.branches.main });
    expect(l.labels.filter((x) => x.kind === "branch").map((x) => x.name).sort()).toEqual(["fitur", "main"]);
  });

  it("detached HEAD tetap mendapat label head", () => {
    const s1 = commitFile(init(), "a", "1", "satu");
    const first = s1.branches.main;
    const s = run(commitFile(s1, "a", "2", "dua"), `git checkout ${first}`);
    expect(computeGraphLayout(s).labels).toContainEqual({ name: "HEAD", kind: "head", commitId: first });
  });

  it("tidak ada dua node di posisi yang sama setelah branch hasil merge dihapus", () => {
    let s = commitFile(init(), "a", "1", "satu");
    s = run(s, "git switch -c fitur");
    s = commitFile(s, "b", "1", "fitur");
    s = run(s, "git switch main");
    s = commitFile(s, "c", "1", "main");
    s = run(run(s, "git merge fitur"), "git branch -d fitur");
    const l = computeGraphLayout(s);
    const positions = l.nodes.map((n) => `${n.x},${n.y}`);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it("ukuran graf mencakup semua node", () => {
    const s = commitFile(init(), "a", "1", "satu");
    const l = computeGraphLayout(s);
    expect(l.width).toBeGreaterThanOrEqual(80);
    expect(l.height).toBeGreaterThanOrEqual(80);
  });
});
