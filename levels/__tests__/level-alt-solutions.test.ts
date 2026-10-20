import { describe, expect, it } from "vitest";
import { LEVELS } from "../index";
import { runCommand } from "../../engine";
import { applySteps, cmd, idByMessage, treeMatchesHead, write } from "../solve";
import { REMOTE_URL, remoteWorld } from "../history";

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

describe("remoteWorld", () => {
  const cloned = remoteWorld({ cloned: true, teammate: [write("docs.md", "Docs"), cmd("git add ."), cmd('git commit -m "Update docs"')], local: [write("a.txt", "a"), cmd("git add ."), cmd('git commit -m "Local"')] });
  it("cloned: true menghasilkan remote.commits yang mencakup commits", () => {
    const w = remoteWorld({ cloned: true, teammate: [write("docs.md", "Docs"), cmd("git add ."), cmd('git commit -m "Update docs"')] });
    for (const id of Object.keys(w.commits)) expect(w.remote?.commits[id]).toBeDefined();
    expect(Object.keys(w.remote!.commits).length).toBeGreaterThan(Object.keys(w.commits).length);
    expect(w.remote?.connected).toBe(true);
  });
  it("commit lokal bersekuens lebih besar daripada commit teman", () => {
    const friend = Object.values(cloned.remote!.commits).find((c) => c.message === "Update docs")!;
    const mine = Object.values(cloned.commits).find((c) => c.message === "Local")!;
    expect(mine.seq).toBeGreaterThan(friend.seq);
  });
  it("origin/main belum di-fetch: tertinggal dari ujung remote", () => {
    expect(cloned.remoteRefs.main).not.toBe(cloned.remote?.branches.main);
  });
  it("cloned: false: folder kosong dan remote tak terhubung", () => {
    const w = remoteWorld({ cloned: false });
    expect(w.initialized).toBe(false);
    expect(w.remote?.connected).toBe(false);
  });
});

describe("level 18 (clone)", () => {
  const l = level(18);
  it("selesai dengan URL lengkap dan tanpa .git", () => {
    expect(l.isGoalReached(run(18, `git clone ${REMOTE_URL}`))).toBe(true);
    expect(l.isGoalReached(run(18, `git clone ${REMOTE_URL.replace(/\.git$/, "")}`))).toBe(true);
  });
  it("URL salah gagal", () => {
    expect(runCommand(l.initialState, "git clone https://github.com/x/y.git").ok).toBe(false);
  });
});

describe("level 19 (push)", () => {
  const l = level(19);
  it("selesai dengan git push origin main", () => {
    const s = applySteps(l.initialState, [cmd("git add ."), cmd('git commit -m "Add notes"'), cmd("git push origin main")]);
    expect(l.isGoalReached(s)).toBe(true);
  });
  it("tidak selesai hanya dengan git add .", () => {
    expect(l.isGoalReached(run(19, "git add ."))).toBe(false);
  });
  it("push sebelum commit tidak memindahkan ujung remote", () => {
    const before = l.initialState.remote?.branches.main;
    const r = runCommand(l.initialState, "git push");
    expect(r.state.remote?.branches.main).toBe(before);
    expect(l.isGoalReached(r.state)).toBe(false);
  });
});

describe("level 20 (pull)", () => {
  const l = level(20);
  it("selesai dengan git pull", () => {
    expect(l.isGoalReached(run(20, "git pull"))).toBe(true);
  });
  it("selesai dengan git fetch lalu git merge origin/main", () => {
    const s = applySteps(l.initialState, [cmd("git fetch"), cmd("git merge origin/main")]);
    expect(l.isGoalReached(s)).toBe(true);
  });
  it("tidak selesai dengan git fetch saja", () => {
    expect(l.isGoalReached(run(20, "git fetch"))).toBe(false);
  });
});

describe("level 21 (push ditolak)", () => {
  const l = level(21);
  it("git push di state awal ditolak dan state tidak berubah", () => {
    const r = runCommand(l.initialState, "git push");
    expect(r.ok).toBe(false);
    expect(r.state).toEqual(l.initialState);
    expect(JSON.stringify(r.output)).toContain("(fetch first)");
  });
  it("setelah git fetch, push ditolak sebagai non-fast-forward", () => {
    const fetched = run(21, "git fetch");
    const r = runCommand(fetched, "git push");
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.output)).toContain("(non-fast-forward)");
  });
  it("selesai dengan git pull lalu git push", () => {
    expect(l.isGoalReached(applySteps(l.initialState, [cmd("git pull"), cmd("git push")]))).toBe(true);
  });
  it("selesai dengan git fetch, git rebase origin/main, git push (riwayat linear)", () => {
    const s = applySteps(l.initialState, [cmd("git fetch"), cmd("git rebase origin/main"), cmd("git push")]);
    expect(l.isGoalReached(s)).toBe(true);
    const tip = s.branches["main"];
    expect(s.commits[tip].parents).toHaveLength(1);
  });
  it("tidak selesai hanya dengan git pull tanpa push", () => {
    expect(l.isGoalReached(run(21, "git pull"))).toBe(false);
  });
});
