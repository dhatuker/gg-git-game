import { describe, expect, it } from "vitest";
import { LEVELS } from "../index";
import { runCommand } from "../../engine";
import { applySteps, cmd, idByMessage, treeMatchesHead } from "../solve";

const level = (id: number) => LEVELS[id - 1];
const run = (id: number, input: string) => applySteps(level(id).initialState, [cmd(input)]);

describe("level 11 (reset, commit tetap ada di riwayat)", () => {
  const l = level(11);
  it("terpenuhi oleh mixed, soft, dan hash eksplisit", () => {
    expect(l.isGoalReached(run(11, "git reset HEAD~1"))).toBe(true);
    expect(l.isGoalReached(run(11, "git reset --soft HEAD~1"))).toBe(true);
    const target = idByMessage(l.initialState, "Refactor app init");
    expect(l.isGoalReached(run(11, `git reset ${target}`))).toBe(true);
  });
  it("tidak terpenuhi oleh --hard", () => {
    expect(l.isGoalReached(run(11, "git reset --hard HEAD~1"))).toBe(false);
  });
});

describe("level 12 (buang eksperimen)", () => {
  const l = level(12);
  it("terpenuhi oleh --hard HEAD~2 dan --hard hash", () => {
    expect(l.isGoalReached(run(12, "git reset --hard HEAD~2"))).toBe(true);
    const target = idByMessage(l.initialState, "Refactor app init");
    expect(l.isGoalReached(run(12, `git reset --hard ${target}`))).toBe(true);
  });
  it("tidak terpenuhi oleh --soft atau --mixed", () => {
    expect(l.isGoalReached(run(12, "git reset --soft HEAD~2"))).toBe(false);
    expect(l.isGoalReached(run(12, "git reset HEAD~2"))).toBe(false);
  });
});

describe("helper", () => {
  it("idByMessage melempar bila tidak ada", () => {
    expect(() => idByMessage(level(11).initialState, "nope")).toThrow();
  });
  it("treeMatchesHead", () => {
    expect(treeMatchesHead(level(12).initialState)).toBe(true);
    expect(treeMatchesHead(run(12, "git reset HEAD~2"))).toBe(false);
  });
});

describe("level 13 (revert)", () => {
  const l = level(13);
  it("terpenuhi oleh revert hash", () => {
    const bad = idByMessage(l.initialState, "Add risky tracking");
    expect(l.isGoalReached(run(13, `git revert ${bad}`))).toBe(true);
  });
  it("tidak terpenuhi oleh reset --hard HEAD~2", () => {
    expect(l.isGoalReached(run(13, "git reset --hard HEAD~2"))).toBe(false);
  });
});

describe("level 14 (stash)", () => {
  const l = level(14);
  it("git switch hotfix gagal karena perubahan belum di-commit", () => {
    expect(runCommand(l.initialState, "git switch hotfix").ok).toBe(false);
  });
  it("tidak selesai tanpa stash pop", () => {
    const steps = l.solution.filter((s) => !(s.kind === "cmd" && s.input === "git stash pop"));
    expect(l.isGoalReached(applySteps(l.initialState, steps))).toBe(false);
  });
});

describe("level 15 (cherry-pick)", () => {
  const l = level(15);
  it("tidak terpenuhi oleh merge experiment", () => {
    expect(l.isGoalReached(run(15, "git merge experiment"))).toBe(false);
  });
});

describe("level 16 (rebase)", () => {
  const l = level(16);
  it("terpenuhi oleh git rebase main", () => {
    expect(l.isGoalReached(run(16, "git rebase main"))).toBe(true);
  });
  it("tidak terpenuhi oleh git merge main", () => {
    expect(l.isGoalReached(run(16, "git merge main"))).toBe(false);
  });
});

describe("level 17 (rebase berkonflik)", () => {
  const l = level(17);
  const resolveWith = (choice: "ours" | "theirs") =>
    applySteps(l.initialState, [
      cmd("git rebase main"),
      { kind: "resolve", file: "README.md", choice },
      cmd("git add README.md"),
      cmd("git rebase --continue"),
    ]);
  it("berhenti di tengah rebase belum selesai", () => {
    const mid = run(17, "git rebase main");
    expect(mid.rebaseState).not.toBeNull();
    expect(l.isGoalReached(mid)).toBe(false);
  });
  it("selesai dengan ours maupun theirs", () => {
    expect(l.isGoalReached(resolveWith("ours"))).toBe(true);
    expect(l.isGoalReached(resolveWith("theirs"))).toBe(true);
  });
  it("rebase --abort tidak mencapai tujuan", () => {
    expect(l.isGoalReached(applySteps(l.initialState, [cmd("git rebase main"), cmd("git rebase --abort")]))).toBe(false);
  });
});

describe("petunjuk level 17 bertingkat", () => {
  const l = level(17);
  it("petunjuk 1 konseptual: tanpa menyebut rebase atau main", () => {
    for (const text of [l.hints[0].id, l.hints[0].en]) {
      expect(text.toLowerCase()).not.toContain("rebase");
      expect(text).not.toContain("main");
    }
  });
});
