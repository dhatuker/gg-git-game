import { describe, expect, it } from "vitest";
import { runCommand } from "../../engine";
import { writeFile } from "../../engine/files";
import { createEmptyRepo } from "../../engine/state";
import type { RepoState } from "../../engine/types";
import { computeGraphLayout } from "../layout";
import { attachRemote, teammateCommit } from "../../engine/__tests__/helpers";

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

describe("berbagi jalur", () => {
  it("cabang yang rentangnya tidak tumpang tindih berbagi satu jalur samping", () => {
    let s = commitFile(init(), "a", "1", "c1");
    s = run(s, "git switch -c x");
    s = commitFile(s, "x", "1", "x1");
    s = run(s, "git switch main");
    s = commitFile(s, "a", "2", "c2");
    s = run(run(s, "git merge x"), "git branch -d x");
    s = commitFile(s, "a", "3", "c3");
    s = commitFile(s, "a", "4", "c4");
    s = run(s, "git switch -c y");
    s = commitFile(s, "y", "1", "y1");
    s = run(s, "git switch main");
    s = commitFile(s, "a", "5", "c5");
    s = run(run(s, "git merge y"), "git branch -d y");
    const l = computeGraphLayout(s);
    expect(Math.max(...l.nodes.map((n) => n.lane))).toBe(1);
    const pos = l.nodes.map((n) => `${n.x},${n.y}`);
    expect(new Set(pos).size).toBe(pos.length);
  });

  it("cabang yang tumpang tindih tetap di jalur berbeda", () => {
    let s = commitFile(init(), "a", "1", "c1");
    s = run(s, "git branch x");
    s = run(s, "git switch -c y");
    s = commitFile(s, "y", "1", "y1");
    s = run(s, "git switch x");
    s = commitFile(s, "x", "1", "x1");
    const l = computeGraphLayout(s);
    const lanes = new Set(l.nodes.map((n) => n.lane));
    expect(lanes.size).toBe(3);
  });
});

describe("computeGraphLayout: node yatim", () => {
  const linear = () => {
    let s = commitFile(init(), "a", "1", "satu");
    s = commitFile(s, "a", "2", "dua");
    return commitFile(s, "a", "3", "tiga");
  };

  it("tanpa reset tidak ada node yatim", () => {
    const l = computeGraphLayout(linear());
    expect(l.nodes.every((n) => !n.orphan)).toBe(true);
    expect(l.edges.every((e) => !e.orphan)).toBe(true);
  });

  it("setelah reset --hard HEAD~1 commit teratas yatim beserta edge-nya", () => {
    const before = linear();
    const top = before.branches.main;
    const l = computeGraphLayout(run(before, "git reset --hard HEAD~1"));
    expect(l.nodes.filter((n) => n.orphan).map((n) => n.id)).toEqual([top]);
    expect(l.nodes.every((n) => typeof n.lane === "number")).toBe(true);
    for (const e of l.edges) expect(e.orphan).toBe(e.from === top || e.to === top);
    expect(l.edges.some((e) => e.orphan)).toBe(true);
  });

  function rebaseSetup(conflict: boolean) {
    let s = commitFile(init(), "a", "1", "dasar");
    s = run(s, "git switch -c fitur");
    s = commitFile(s, conflict ? "a" : "b", "f1", "f1");
    s = commitFile(s, "c", "f2", "f2");
    const orig = [s.branches.fitur, s.commits[s.branches.fitur].parents[0]];
    s = run(s, "git switch main");
    s = commitFile(s, conflict ? "a" : "d", "m1", "m1");
    s = run(s, "git switch fitur");
    return { s, orig };
  }

  it("setelah rebase selesai dua commit asli yatim, salinan tidak", () => {
    const { s, orig } = rebaseSetup(false);
    const done = run(s, "git rebase main");
    expect(done.rebaseState).toBeFalsy();
    const l = computeGraphLayout(done);
    expect(l.nodes.filter((n) => n.orphan).map((n) => n.id).sort()).toEqual([...orig].sort());
    expect(l.nodes.find((n) => n.id === done.branches.fitur)!.orphan).toBe(false);
  });

  it("selama rebase berhenti karena konflik commit asli belum yatim", () => {
    const { s } = rebaseSetup(true);
    const r = runCommand(s, "git rebase main");
    const st = r.state;
    expect(st.rebaseState).toBeTruthy();
    const l = computeGraphLayout(st);
    expect(l.nodes.some((n) => n.orphan)).toBe(false);
  });
});

describe("computeGraphLayout remote", () => {
  it("tanpa remoteRefs tidak ada label remote", () => {
    const l = computeGraphLayout(commitFile(init(), "a", "1", "satu"));
    expect(l.labels.some((x) => x.kind === "remote")).toBe(false);
  });
  it("label origin/main di commit remoteRefs.main", () => {
    let s = commitFile(init(), "a", "1", "satu");
    s = attachRemote(s);
    s = commitFile(s, "a", "2", "dua");
    const l = computeGraphLayout(s);
    expect(l.labels).toContainEqual({ name: "origin/main", kind: "remote", commitId: s.remoteRefs.main });
    expect(l.nodes.find((n) => n.id === s.remoteRefs.main)?.lane).toBe(0);
  });
  it("commit yang hanya terjangkau dari origin/main mendapat lane sendiri (lewat fetch nyata)", () => {
    let s = attachRemote(commitFile(init(), "a", "1", "satu"));
    const base = s.branches.main;
    s = teammateCommit(s, "t", "1", "teman");
    s = run(s, "git fetch");
    const tip = s.remoteRefs.main;
    expect(tip).not.toBe(base);
    expect(s.branches.main).toBe(base);
    const l = computeGraphLayout(s);
    const baseNode = l.nodes.find((x) => x.id === base)!;
    const tipNode = l.nodes.find((x) => x.id === tip)!;
    expect(baseNode.lane).toBe(0);
    expect(tipNode.lane).toBe(1);
    expect(tipNode.x).toBeGreaterThan(baseNode.x);
    expect(l.labels).toContainEqual({ name: "main", kind: "branch", commitId: base });
    expect(l.labels).toContainEqual({ name: "origin/main", kind: "remote", commitId: tip });
  });
});
