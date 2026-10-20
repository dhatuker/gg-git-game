import { describe, expect, it } from "vitest";
import { resolveConflict } from "../files";
import { isReachable, unreachableCommits } from "../state";
import type { RepoState } from "../types";
import { attachRemote, exec, initRepo, keys, paramsOf, rawText, run, teammateCommit, write } from "./helpers";

function commitFile(state: RepoState, file: string, content: string, msg: string): RepoState {
  return run(run(write(state, file, content), "git add ."), `git commit -m "${msg}"`);
}

/** c1 (a.txt); main: m1 (m.txt) -> m2 (n.txt); feature: f1 (f.txt) -> f2 (g.txt); HEAD di feature. */
function setup(): RepoState {
  let s = commitFile(initRepo(), "a.txt", "1", "c1");
  s = run(s, "git switch -c feature");
  s = commitFile(s, "f.txt", "f", "f1");
  s = commitFile(s, "g.txt", "g", "f2");
  s = run(s, "git switch main");
  s = commitFile(s, "m.txt", "m", "m1");
  s = commitFile(s, "n.txt", "n", "m2");
  return run(s, "git switch feature");
}

/** Konflik di a.txt: main mengubah a.txt; feature: f1 (opsional mengubah a.txt) lalu f2. */
function conflictSetup(conflictAt: "first" | "second"): RepoState {
  let s = commitFile(initRepo(), "a.txt", "1", "c1");
  s = run(s, "git switch -c feature");
  if (conflictAt === "first") {
    s = commitFile(s, "a.txt", "feature", "f1");
    s = commitFile(s, "g.txt", "g", "f2");
  } else {
    s = commitFile(s, "g.txt", "g", "f1");
    s = commitFile(s, "a.txt", "feature", "f2");
  }
  s = run(s, "git switch main");
  s = commitFile(s, "a.txt", "main", "m1");
  return run(s, "git switch feature");
}

describe("git rebase <branch>", () => {
  it("menyalin commit feature ke atas main menjadi riwayat linear", () => {
    const s = setup();
    const [f2, f1] = [s.branches.feature, s.commits[s.branches.feature].parents[0]];
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(true);
    const tip = r.state.branches.feature;
    const copy2 = r.state.commits[tip];
    const copy1 = r.state.commits[copy2.parents[0]];
    expect(copy1.parents).toEqual([s.branches.main]);
    expect(isReachable(r.state, tip, s.branches.main)).toBe(true);
    expect([copy1.message, copy2.message]).toEqual(["f1", "f2"]);
    expect(copy1.id).not.toBe(f1);
    expect(copy2.id).not.toBe(f2);
    expect(r.state.branches.main).toBe(s.branches.main);
    expect(r.state.head).toEqual({ type: "branch", name: "feature" });
    expect(r.state.rebaseState).toBeNull();
    expect(unreachableCommits(r.state)).toEqual([f2, f1]);
    expect(r.events).toEqual([
      { type: "rebase-commit-disalin", from: f1, to: copy1.id },
      { type: "rebase-commit-disalin", from: f2, to: copy2.id },
      { type: "rebase-selesai", branch: "feature", tip },
    ]);
    expect(r.state.files).toEqual({ "a.txt": "1", "m.txt": "m", "n.txt": "n", "f.txt": "f", "g.txt": "g" });
    expect(r.state.index).toEqual(copy2.snapshot);
    expect(keys(r)).toContain("rebase.done");
    expect(paramsOf(r, "rebase.done")).toEqual({ branch: "feature", count: 2 });
  });

  it("mempertahankan file tak terlacak", () => {
    const s = write(setup(), "draft.txt", "x");
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(true);
    expect(r.state.files["draft.txt"]).toBe("x");
    expect(r.state.index["draft.txt"]).toBeUndefined();
  });

  it("menolak fast-forward yang akan menimpa file tak terlacak, state identik", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = run(s, "git branch feature");
    s = commitFile(s, "m.txt", "m", "m1");
    s = write(run(s, "git switch feature"), "m.txt", "mine");
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["untracked.switch"]);
    expect(paramsOf(r, "untracked.switch")).toEqual({ files: "m.txt" });
    expect(r.state).toBe(s);
    expect(r.events).toEqual([]);
  });

  it("menolak replay bila commit di rentang menimpa file tak terlacak, state identik", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = run(s, "git switch -c feature");
    s = commitFile(s, "f.txt", "f", "f1");
    // f2 menghapus f.txt (setara `git rm f.txt`), lalu f.txt muncul lagi sebagai file tak terlacak.
    const { ["f.txt"]: _gone, ...rest } = s.index;
    void _gone;
    s = run({ ...s, index: rest, files: { ...rest } }, 'git commit -m "f2"');
    s = run(s, "git switch main");
    s = commitFile(s, "m.txt", "m", "m1");
    s = write(run(s, "git switch feature"), "f.txt", "mine");
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["untracked.switch"]);
    expect(paramsOf(r, "untracked.switch")).toEqual({ files: "f.txt" });
    expect(r.state).toBe(s);
    expect(r.events).toEqual([]);
  });

  it("fast-forward bila feature tak punya commit unik dan tertinggal", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = run(s, "git branch feature");
    s = commitFile(s, "m.txt", "m", "m1");
    s = run(s, "git switch feature");
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(true);
    expect(r.state.branches.feature).toBe(s.branches.main);
    expect(r.state.head).toEqual({ type: "branch", name: "feature" });
    expect(r.state.files["m.txt"]).toBe("m");
    expect(r.state.index).toEqual(s.commits[s.branches.main].snapshot);
    expect(r.events).toEqual([{ type: "rebase-selesai", branch: "feature", tip: s.branches.main }]);
    expect(paramsOf(r, "rebase.fastForward")).toEqual({ branch: "feature", to: s.branches.main });
    expect(r.state.rebaseState).toBeNull();
  });

  it("sudah up-to-date: ok tanpa event", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = run(s, "git switch -c feature");
    s = commitFile(s, "f.txt", "f", "f1");
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(true);
    expect(r.events).toEqual([]);
    expect(keys(r)).toEqual(["rebase.upToDate"]);
    expect(paramsOf(r, "rebase.upToDate")).toEqual({ branch: "main" });
    expect(r.state).toEqual(s);
  });

  it("berhenti saat konflik di commit pertama", () => {
    const s = conflictSetup("first");
    const f2 = s.branches.feature;
    const f1 = s.commits[f2].parents[0];
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(true);
    expect(r.state.rebaseState).toEqual({
      branch: "feature",
      onto: s.branches.main,
      originalTip: f2,
      current: f1,
      remaining: [f2],
      conflicts: ["a.txt"],
    });
    expect(r.state.head).toEqual({ type: "detached", id: s.branches.main });
    expect(r.state.files["a.txt"]).toContain("<<<<<<<");
    expect(r.state.index["a.txt"]).toBe("main");
    expect(r.state.branches.feature).toBe(f2);
    expect(r.events).toEqual([{ type: "konflik-terjadi", files: ["a.txt"] }]);
    expect(keys(r)).toEqual(["rebase.conflict", "rebase.conflictNext"]);
    expect(paramsOf(r, "rebase.conflict")).toEqual({ files: "a.txt", id: f1 });
    expect(rawText(r)).toContain("CONFLICT (content): Merge conflict in a.txt");
  });

  it("berhenti saat konflik di commit kedua setelah commit pertama tersalin", () => {
    const s = conflictSetup("second");
    const f2 = s.branches.feature;
    const f1 = s.commits[f2].parents[0];
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(true);
    const rs = r.state.rebaseState;
    expect(rs?.current).toBe(f2);
    expect(rs?.remaining).toEqual([]);
    expect(rs?.conflicts).toEqual(["a.txt"]);
    expect(r.state.head.type).toBe("detached");
    const headId = r.state.head.type === "detached" ? r.state.head.id : "";
    const copy1 = r.state.commits[headId];
    expect(copy1.message).toBe("f1");
    expect(copy1.parents).toEqual([s.branches.main]);
    expect(r.state.files["g.txt"]).toBe("g");
    expect(r.state.files["a.txt"]).toContain("<<<<<<<");
    expect(r.state.branches.feature).toBe(f2);
    expect(r.events).toEqual([
      { type: "rebase-commit-disalin", from: f1, to: copy1.id },
      { type: "konflik-terjadi", files: ["a.txt"] },
    ]);
  });

  it("menolak bila rentang berisi merge commit, state identik", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = run(s, "git switch -c feature");
    s = commitFile(s, "f.txt", "f", "f1");
    s = run(s, "git switch -c side");
    s = commitFile(s, "s.txt", "s", "s1");
    s = run(s, "git switch feature");
    s = commitFile(s, "g.txt", "g", "f2");
    s = run(s, "git merge side");
    s = run(s, "git switch main");
    s = commitFile(s, "m.txt", "m", "m1");
    s = run(s, "git switch feature");
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.hasMerges"]);
    expect(r.state).toEqual(s);
    expect(r.events).toEqual([]);
  });

  it("menolak HEAD detached", () => {
    const s = setup();
    const d = run(s, `git checkout ${s.branches.feature}`);
    const r = exec(d, "git rebase main");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.notOnBranch"]);
    expect(r.state).toEqual(d);
  });

  it("menolak target yang tidak ada", () => {
    const s = setup();
    const r = exec(s, "git rebase nope");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.notFound"]);
    expect(paramsOf(r, "rebase.notFound")).toEqual({ branch: "nope" });
    expect(r.state).toEqual(s);
  });

  it("flag lain yang tidak dikenal tetap dianggap nama branch (notFound)", () => {
    const s = setup();
    const r = exec(s, "git rebase --skip");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.notFound"]);
    expect(paramsOf(r, "rebase.notFound")).toEqual({ branch: "--skip" });
    expect(r.state).toEqual(s);
  });

  it("menolak target = branch aktif", () => {
    const s = setup();
    const r = exec(s, "git rebase feature");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.sameBranch"]);
    expect(r.state).toEqual(s);
  });

  it("menolak working tree kotor", () => {
    const s = write(setup(), "f.txt", "dirty");
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["state.dirty"]);
    expect(r.state).toEqual(s);
  });

  it("menolak tanpa argumen", () => {
    const s = setup();
    const r = exec(s, "git rebase");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.needTarget"]);
    expect(r.state).toEqual(s);
  });

  it("menolak saat rebase lain masih berjalan", () => {
    const s = run(conflictSetup("first"), "git rebase main");
    const r = exec(s, "git rebase main");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.inProgress"]);
    expect(r.state).toEqual(s);
  });
});

/** c1 (a.txt=1, b.txt=1); feature: f1 (a.txt=feature) -> f2 (b.txt=feature); main: m1 (a.txt=main, b.txt=main). */
function doubleConflictSetup(): RepoState {
  let s = run(run(write(write(initRepo(), "a.txt", "1"), "b.txt", "1"), "git add ."), 'git commit -m "c1"');
  s = run(s, "git switch -c feature");
  s = commitFile(s, "a.txt", "feature", "f1");
  s = commitFile(s, "b.txt", "feature", "f2");
  s = run(s, "git switch main");
  s = run(run(write(write(s, "a.txt", "main"), "b.txt", "main"), "git add ."), 'git commit -m "m1"');
  return run(s, "git switch feature");
}

function resolve(state: RepoState, file: string, choice: "ours" | "theirs"): RepoState {
  const r = resolveConflict(state, file, choice);
  if (r.error) throw new Error(r.error.key);
  return r.state;
}

describe("git rebase --continue", () => {
  it("alur lengkap: konflik, pilih isi, add, continue sampai selesai", () => {
    const s = conflictSetup("first");
    const f2 = s.branches.feature;
    const f1 = s.commits[f2].parents[0];
    const stopped = run(s, "git rebase main");

    expect(resolve(stopped, "a.txt", "ours").files["a.txt"]).toBe("main");
    const theirs = resolve(stopped, "a.txt", "theirs");
    expect(theirs.files["a.txt"]).toBe("feature");

    const added = run(theirs, "git add a.txt");
    expect(added.rebaseState?.conflicts).toEqual([]);

    const r = exec(added, "git rebase --continue");
    expect(r.ok).toBe(true);
    const tip = r.state.branches.feature;
    const copy2 = r.state.commits[tip];
    const copy1 = r.state.commits[copy2.parents[0]];
    expect(copy1.parents).toEqual([s.branches.main]);
    expect([copy1.message, copy2.message]).toEqual(["f1", "f2"]);
    expect(copy1.snapshot["a.txt"]).toBe("feature");
    expect(r.state.rebaseState).toBeNull();
    expect(r.state.head).toEqual({ type: "branch", name: "feature" });
    expect(r.state.files).toEqual({ "a.txt": "feature", "g.txt": "g" });
    expect(r.events).toEqual([
      { type: "rebase-commit-disalin", from: f1, to: copy1.id },
      { type: "rebase-commit-disalin", from: f2, to: copy2.id },
      { type: "rebase-selesai", branch: "feature", tip },
    ]);
    expect(keys(r)).toContain("rebase.done");
    expect(unreachableCommits(r.state)).toEqual([f2, f1]);
  });

  it("menolak bila konflik masih tersisa, state identik", () => {
    const s = run(conflictSetup("first"), "git rebase main");
    const r = exec(s, "git rebase --continue");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.continueConflictsRemain"]);
    expect(paramsOf(r, "rebase.continueConflictsRemain")).toEqual({ files: "a.txt" });
    expect(r.state).toBe(s);
    expect(r.events).toEqual([]);
  });

  it("berhenti lagi bila commit berikutnya juga konflik", () => {
    const s = doubleConflictSetup();
    const f2 = s.branches.feature;
    const f1 = s.commits[f2].parents[0];
    const stopped = run(s, "git rebase main");
    expect(stopped.rebaseState?.current).toBe(f1);
    const added = run(resolve(stopped, "a.txt", "theirs"), "git add a.txt");
    const r = exec(added, "git rebase --continue");
    expect(r.ok).toBe(true);
    const headId = r.state.head.type === "detached" ? r.state.head.id : "";
    const copy1 = r.state.commits[headId];
    expect(copy1.message).toBe("f1");
    expect(copy1.parents).toEqual([s.branches.main]);
    expect(r.state.rebaseState).toEqual({
      branch: "feature",
      onto: s.branches.main,
      originalTip: f2,
      current: f2,
      remaining: [],
      conflicts: ["b.txt"],
    });
    expect(r.state.files["b.txt"]).toContain("<<<<<<<");
    expect(r.state.branches.feature).toBe(f2);
    expect(r.events).toEqual([
      { type: "rebase-commit-disalin", from: f1, to: copy1.id },
      { type: "konflik-terjadi", files: ["b.txt"] },
    ]);
    expect(keys(r)).toEqual(["rebase.conflict", "rebase.conflictNext"]);
  });

  it("tanpa rebase berjalan: notInProgress, state identik", () => {
    const s = setup();
    const r = exec(s, "git rebase --continue");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.notInProgress"]);
    expect(r.state).toBe(s);
    expect(r.events).toEqual([]);
  });
});

describe("git rebase --abort", () => {
  it("mengembalikan branch, HEAD, dan file ke keadaan sebelum rebase", () => {
    const before = write(conflictSetup("second"), "draft.txt", "x");
    const f2 = before.branches.feature;
    const stopped = run(before, "git rebase main");
    const copy1 = stopped.head.type === "detached" ? stopped.head.id : "";
    const r = exec(stopped, "git rebase --abort");
    expect(r.ok).toBe(true);
    expect(r.state.branches.feature).toBe(f2);
    expect(r.state.branches.main).toBe(before.branches.main);
    expect(r.state.head).toEqual({ type: "branch", name: "feature" });
    expect(r.state.rebaseState).toBeNull();
    expect(r.state.files).toEqual({ ...before.commits[f2].snapshot, "draft.txt": "x" });
    expect(r.state.index).toEqual(before.commits[f2].snapshot);
    expect(r.events).toEqual([{ type: "rebase-dibatalkan", branch: "feature" }]);
    expect(keys(r)).toEqual(["rebase.aborted"]);
    expect(paramsOf(r, "rebase.aborted")).toEqual({ branch: "feature" });
    expect(r.state.commits[copy1]).toBeDefined();
    expect(unreachableCommits(r.state)).toEqual([copy1]);
  });

  it("tanpa rebase berjalan: notInProgress, state identik", () => {
    const s = setup();
    const r = exec(s, "git rebase --abort");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.notInProgress"]);
    expect(r.state).toBe(s);
    expect(r.events).toEqual([]);
  });
});

describe("git rebase --continue dengan perubahan tak ter-stage", () => {
  it("menolak bila file terlacak berbeda dari index, state tak berubah; sesudah add berhasil", () => {
    const stopped = run(conflictSetup("first"), "git rebase main");
    const added = run(resolve(stopped, "a.txt", "theirs"), "git add a.txt");
    const edited = write(added, "a.txt", "suntingan");
    const r = exec(edited, "git rebase --continue");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.continueUnstaged"]);
    expect(paramsOf(r, "rebase.continueUnstaged")).toEqual({ files: "a.txt" });
    expect(rawText(r)).toBe("error: cannot rebase: You have unstaged changes.");
    expect(r.state).toBe(edited);

    const ok = exec(run(edited, "git add a.txt"), "git rebase --continue");
    expect(ok.ok).toBe(true);
    expect(ok.state.rebaseState).toBeNull();
    expect(ok.state.files["a.txt"]).toBe("suntingan");
    expect(ok.state.files["g.txt"]).toBe("g");
  });
});

describe("git rebase origin/main", () => {
  it("memindahkan commit lokal ke atas origin/main", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = attachRemote(s);
    s = teammateCommit(s, "t.txt", "t", "teman");
    s = { ...s, commits: { ...s.commits, ...s.remote!.commits }, remoteRefs: { ...s.remote!.branches } };
    s = commitFile(s, "m.txt", "m", "lokal");
    const r = exec(s, "git rebase origin/main");
    expect(r.ok).toBe(true);
    const tip = r.state.commits[r.state.branches.main];
    expect(tip.message).toBe("lokal");
    expect(tip.parents[0]).toBe(s.remoteRefs.main);
  });
});
