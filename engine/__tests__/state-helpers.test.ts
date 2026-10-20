import { describe, expect, it } from "vitest";
import { activeConflicts, conflictSources, createEmptyRepo, inProgressBlock, markResolved, unreachableCommits } from "../state";
import type { RebaseState, RepoState } from "../types";
import { exec, initRepo, run, write } from "./helpers";

function commitFile(state: RepoState, file: string, content: string, msg: string): RepoState {
  return run(run(write(state, file, content), "git add ."), `git commit -m "${msg}"`);
}

function conflicted(): RepoState {
  let s = commitFile(initRepo(), "README.md", "awal", "awal");
  s = run(s, "git switch -c fitur");
  s = commitFile(s, "README.md", "versi fitur", "di fitur");
  s = run(s, "git switch main");
  s = commitFile(s, "README.md", "versi main", "di main");
  return exec(s, "git merge fitur").state;
}

const rebase = (over: Partial<RebaseState> = {}): RebaseState => ({
  branch: "fitur",
  onto: "main",
  originalTip: "aaa",
  current: "bbb",
  remaining: [],
  conflicts: ["x.txt"],
  ...over,
});

describe("state helpers", () => {
  it("repo kosong punya stash dan rebaseState awal", () => {
    const s = createEmptyRepo();
    expect(s.stash).toEqual([]);
    expect(s.rebaseState).toBeNull();
  });

  it("unreachableCommits", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "satu");
    s = commitFile(s, "a.txt", "2", "dua");
    expect(unreachableCommits(s)).toEqual([]);
    const tip = s.branches.main;
    const parent = s.commits[tip].parents[0];
    const moved = { ...s, branches: { ...s.branches, main: parent } };
    expect(unreachableCommits(moved)).toEqual([tip]);
    const detached: RepoState = { ...moved, head: { type: "detached", id: tip } };
    expect(unreachableCommits(detached)).toEqual([]);
  });

  it("activeConflicts", () => {
    expect(activeConflicts(conflicted())).toEqual(["README.md"]);
    expect(activeConflicts({ ...createEmptyRepo(), rebaseState: rebase() })).toEqual(["x.txt"]);
    expect(activeConflicts(createEmptyRepo())).toEqual([]);
  });

  it("markResolved", () => {
    const s = conflicted();
    const r = markResolved(s, ["README.md"]);
    expect(r.resolved).toEqual(["README.md"]);
    expect(r.remaining).toEqual([]);
    expect(r.state.mergeState?.conflicts).toEqual([]);
    const none = markResolved(createEmptyRepo(), ["a"]);
    expect(none.remaining).toBeNull();
    expect(none.resolved).toEqual([]);
    const rb = markResolved({ ...createEmptyRepo(), rebaseState: rebase({ conflicts: ["x.txt", "y.txt"] }) }, ["x.txt"]);
    expect(rb.remaining).toEqual(["y.txt"]);
    expect(rb.state.rebaseState?.conflicts).toEqual(["y.txt"]);
  });

  it("conflictSources", () => {
    const s = conflicted();
    expect(conflictSources(s)).toEqual({ ours: s.branches.main, theirs: s.mergeState!.fromCommit });
    const base = commitFile(initRepo(), "a.txt", "1", "satu");
    const rb: RepoState = { ...base, rebaseState: rebase() };
    expect(conflictSources(rb)).toEqual({ ours: base.branches.main, theirs: "bbb" });
    expect(conflictSources(base)).toBeNull();
  });

  it("inProgressBlock", () => {
    expect(inProgressBlock(createEmptyRepo())).toBeNull();
    const m = inProgressBlock(conflicted());
    expect(m?.ok).toBe(false);
    expect(m?.output[0]).toEqual({ key: "merge.inProgress" });
    const r = inProgressBlock({ ...createEmptyRepo(), rebaseState: rebase() });
    expect(r?.ok).toBe(false);
    expect(r?.output[0]).toEqual({ key: "rebase.inProgress" });
  });
});
