import { describe, expect, it } from "vitest";
import { headSnapshot } from "../state";
import type { RepoState } from "../types";
import { exec, initRepo, keys, paramsOf, rawText, run, write } from "./helpers";

function commitFile(state: RepoState, file: string, content: string, msg: string): RepoState {
  return run(run(write(state, file, content), "git add ."), `git commit -m "${msg}"`);
}

/** Satu commit di main: a.txt=1, b.txt=1. */
function base(): RepoState {
  return commitFile(commitFile(initRepo(), "a.txt", "1", "satu"), "b.txt", "1", "dua");
}

/** a.txt diubah tapi belum di-stage; b.txt diubah dan di-stage. */
function dirty(): RepoState {
  return run(write(write(base(), "a.txt", "A2"), "b.txt", "B2"), "git add b.txt");
}

describe("git stash", () => {
  it("push menyimpan perubahan tak ter-stage dan ter-stage lalu mengembalikan ke HEAD", () => {
    const s = dirty();
    const r = exec(s, "git stash");
    expect(r.ok).toBe(true);
    expect(r.state.stash).toHaveLength(1);
    expect(r.state.stash[0]).toEqual({
      files: { "a.txt": "A2", "b.txt": "B2" },
      index: { "a.txt": "1", "b.txt": "B2" },
      baseCommit: s.branches.main,
    });
    expect(r.state.files).toEqual(headSnapshot(s));
    expect(r.state.index).toEqual(headSnapshot(s));
    expect(keys(r)).toEqual(["stash.saved"]);
    expect(paramsOf(r, "stash.saved")).toEqual({ files: "a.txt, b.txt" });
    expect(r.events).toEqual([{ type: "stash-disimpan", files: ["a.txt", "b.txt"] }]);
    expect(exec(s, "git stash push").state).toEqual(r.state);
  });

  it("push menjaga file tak terlacak", () => {
    const s = write(dirty(), "baru.txt", "x");
    const r = exec(s, "git stash");
    expect(r.state.files["baru.txt"]).toBe("x");
    expect(r.state.stash[0].files).not.toHaveProperty("baru.txt");
    expect(r.events).toEqual([{ type: "stash-disimpan", files: ["a.txt", "b.txt"] }]);
  });

  it("pop mengembalikan isi file sebagai perubahan tak ter-stage dan mengosongkan stash", () => {
    const s = dirty();
    const pushed = run(s, "git stash");
    const r = exec(pushed, "git stash pop");
    expect(r.ok).toBe(true);
    expect(r.state.stash).toHaveLength(0);
    expect(r.state.files).toEqual({ "a.txt": "A2", "b.txt": "B2" });
    expect(r.state.index).toEqual(headSnapshot(s));
    expect(keys(r)).toEqual(["stash.popped"]);
    expect(paramsOf(r, "stash.popped")).toEqual({ files: "a.txt, b.txt" });
    expect(r.events).toEqual([{ type: "stash-dipulihkan", files: ["a.txt", "b.txt"] }]);
  });

  it("pop mengembalikan penghapusan file terlacak", () => {
    const s = base();
    const removed = { ...s, files: { "a.txt": "1" } };
    const pushed = run(removed, "git stash");
    expect(pushed.files).toEqual({ "a.txt": "1", "b.txt": "1" });
    const r = exec(pushed, "git stash pop");
    expect(r.ok).toBe(true);
    expect(r.state.files).toEqual({ "a.txt": "1" });
  });

  it("dua kali push lalu pop mengambil yang terbaru (LIFO)", () => {
    let s = run(write(base(), "a.txt", "pertama"), "git stash");
    s = run(write(s, "a.txt", "kedua"), "git stash");
    expect(s.stash).toHaveLength(2);
    const r = exec(s, "git stash pop");
    expect(r.state.files["a.txt"]).toBe("kedua");
    expect(r.state.stash).toHaveLength(1);
    expect(r.state.stash[0].files["a.txt"]).toBe("pertama");
  });

  it("list memuat stash@{i} dengan branch, hash, dan pesan", () => {
    const s0 = base();
    let s = run(write(s0, "a.txt", "p"), "git stash");
    s = run(write(s, "a.txt", "q"), "git stash");
    const r = exec(s, "git stash list");
    expect(r.ok).toBe(true);
    const id = s0.branches.main;
    expect(rawText(r)).toBe(`stash@{0}: WIP on main: ${id} dua\nstash@{1}: WIP on main: ${id} dua`);
    expect(keys(r)).toEqual([]);
  });

  it("list kosong hanya stash.noneYet", () => {
    const r = exec(base(), "git stash list");
    expect(r.ok).toBe(true);
    expect(keys(r)).toEqual(["stash.noneYet"]);
    expect(rawText(r)).toBe("");
  });

  it("tanpa perubahan atau hanya file tak terlacak -> stash.nothing", () => {
    for (const s of [base(), write(base(), "baru.txt", "x")]) {
      const r = exec(s, "git stash");
      expect(r.ok).toBe(false);
      expect(keys(r)).toEqual(["stash.nothing"]);
      expect(r.state).toBe(s);
    }
  });

  it("sebelum commit pertama -> stash.noCommits", () => {
    const s = run(write(initRepo(), "a.txt", "1"), "git add .");
    const r = exec(s, "git stash");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["stash.noCommits"]);
    expect(r.state).toBe(s);
  });

  it("pop kosong -> stash.empty", () => {
    const r = exec(base(), "git stash pop");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["stash.empty"]);
  });

  it("pop konflik bila working directory sudah berbeda dari HEAD pada path stash", () => {
    let s = run(commitFile(base(), "a.txt", "main2", "tiga"), "git switch -c lain");
    s = run(s, "git switch main");
    s = run(write(s, "a.txt", "stashed"), "git stash");
    s = run(s, "git switch lain");
    s = write(s, "a.txt", "lokal");
    const r = exec(s, "git stash pop");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["stash.conflict"]);
    expect(paramsOf(r, "stash.conflict")).toEqual({ files: "a.txt" });
    expect(r.state).toBe(s);
    expect(r.state.stash).toHaveLength(1);
  });

  it("pop berhasil di branch lain bila path itu bersih", () => {
    let s = run(base(), "git switch -c lain");
    s = run(s, "git switch main");
    s = run(write(s, "a.txt", "stashed"), "git stash");
    s = run(s, "git switch lain");
    const r = exec(s, "git stash pop");
    expect(r.ok).toBe(true);
    expect(r.state.files["a.txt"]).toBe("stashed");
  });

  it("HEAD detached: push berhasil dan list memakai HEAD", () => {
    const s0 = base();
    const first = s0.commits[s0.branches.main].parents[0];
    let s = run(s0, `git switch ${first}`);
    s = write(s, "a.txt", "det");
    const r = exec(s, "git stash");
    expect(r.ok).toBe(true);
    expect(r.state.stash[0].baseCommit).toBe(first);
    expect(rawText(exec(r.state, "git stash list"))).toBe(`stash@{0}: WIP on HEAD: ${first} satu`);
  });

  it("apply, drop, dan -u -> stash.unsupported", () => {
    const s = dirty();
    for (const [cmd, sub] of [["git stash apply", "apply"], ["git stash drop", "drop"], ["git stash -u", "-u"]]) {
      const r = exec(s, cmd);
      expect(r.ok).toBe(false);
      expect(keys(r)).toEqual(["stash.unsupported"]);
      expect(paramsOf(r, "stash.unsupported")).toEqual({ sub });
      expect(r.state).toBe(s);
    }
  });

  it("ditolak saat merge atau rebase aktif", () => {
    const merging = { ...dirty(), mergeState: { from: "x", fromCommit: "abc", conflicts: ["a.txt"] } } as unknown as RepoState;
    expect(keys(exec(merging, "git stash"))).toEqual(["merge.inProgress"]);
    const rebasing = {
      ...dirty(),
      rebaseState: { branch: "main", onto: "x", originalTip: "abc", current: null, remaining: [], conflicts: [] },
    } as RepoState;
    expect(keys(exec(rebasing, "git stash pop"))).toEqual(["rebase.inProgress"]);
  });
});

describe("git stash pop di branch dengan versi file berbeda", () => {
  it("menolak bila HEAD sekarang berbeda dari commit dasar stash pada path itu; stash tetap", () => {
    let s = run(base(), "git switch -c other");
    s = commitFile(s, "a.txt", "versi-other", "ubah di other");
    s = run(s, "git switch main");
    s = run(write(s, "a.txt", "stashed"), "git stash");
    s = run(s, "git switch other");
    const r = exec(s, "git stash pop");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["stash.conflict"]);
    expect(paramsOf(r, "stash.conflict")).toEqual({ files: "a.txt" });
    expect(r.state).toBe(s);
    expect(r.state.stash).toHaveLength(1);
    expect(r.state.files["a.txt"]).toBe("versi-other");
  });
});
