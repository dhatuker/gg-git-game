import { describe, expect, it } from "vitest";
import { exec, initRepo, keys, paramsOf, rawText, run, write } from "./helpers";
import type { RepoState } from "../types";

function base(): RepoState {
  let s = initRepo({ "a.txt": "a1", "b.txt": "b1" });
  s = run(s, "git add .");
  return run(s, 'git commit -m "first"');
}

const changedBoth = () => write(write(base(), "a.txt", "a2"), "b.txt", "b2");

describe("git restore (working directory)", () => {
  it("membuang perubahan satu file dan tidak menyentuh file lain", () => {
    const s = changedBoth();
    const r = exec(s, "git restore a.txt");
    expect(r.ok).toBe(true);
    expect(r.state.files["a.txt"]).toBe("a1");
    expect(r.state.files["b.txt"]).toBe("b2");
    expect(r.state.index).toEqual(s.index);
    expect(keys(r)).toEqual(["restore.done"]);
    expect(paramsOf(r, "restore.done")).toEqual({ files: "a.txt" });
    expect(r.events).toEqual([{ type: "restore-dilakukan", files: ["a.txt"], staged: false }]);
  });

  it("git restore . memulihkan semua file terlacak yang berubah", () => {
    const r = exec(changedBoth(), "git restore .");
    expect(r.state.files).toEqual({ "a.txt": "a1", "b.txt": "b1" });
    expect(r.events).toEqual([{ type: "restore-dilakukan", files: ["a.txt", "b.txt"], staged: false }]);
  });

  it("memulihkan ke isi staging, bukan ke commit", () => {
    let s = run(write(base(), "a.txt", "a2"), "git add a.txt");
    s = write(s, "a.txt", "a3");
    expect(exec(s, "git restore a.txt").state.files["a.txt"]).toBe("a2");
  });

  it("file tak terlacak ditolak", () => {
    const s = write(base(), "c.txt", "c");
    const r = exec(s, "git restore c.txt");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["restore.unknownPath"]);
    expect(rawText(r)).toBe("error: pathspec 'c.txt' did not match any file(s) known to git");
    expect(r.state).toBe(s);
  });

  it("semua atau tidak sama sekali: satu path salah membatalkan semuanya", () => {
    const s = write(base(), "a.txt", "a2");
    const r = exec(s, "git restore a.txt nope");
    expect(r.ok).toBe(false);
    expect(r.state.files["a.txt"]).toBe("a2");
  });

  it("tidak ada yang perlu dipulihkan", () => {
    const r = exec(base(), "git restore .");
    expect(r.ok).toBe(true);
    expect(keys(r)).toEqual(["restore.nothing"]);
    expect(r.events).toEqual([]);
  });

  it("tanpa path", () => {
    expect(keys(exec(base(), "git restore"))).toEqual(["restore.needPath"]);
    expect(keys(exec(base(), "git restore --staged"))).toEqual(["restore.needPath"]);
  });
});

describe("git restore --staged", () => {
  it("mengeluarkan perubahan dari staging tanpa menyentuh working directory", () => {
    const s = run(write(base(), "a.txt", "a2"), "git add a.txt");
    const r = exec(s, "git restore --staged a.txt");
    expect(r.ok).toBe(true);
    expect(r.state.index["a.txt"]).toBe("a1");
    expect(r.state.files["a.txt"]).toBe("a2");
    expect(keys(r)).toEqual(["restore.unstaged"]);
    expect(r.events).toEqual([{ type: "restore-dilakukan", files: ["a.txt"], staged: true }]);
  });

  it("file baru kembali tak terlacak", () => {
    const s = run(write(base(), "c.txt", "c"), "git add c.txt");
    const r = exec(s, "git restore --staged c.txt");
    expect("c.txt" in r.state.index).toBe(false);
    expect(r.state.files["c.txt"]).toBe("c");
  });

  it("repo tanpa commit: file keluar dari index", () => {
    const s = run(initRepo({ "x.txt": "1" }), "git add x.txt");
    const r = exec(s, "git restore --staged x.txt");
    expect(r.ok).toBe(true);
    expect(r.state.index).toEqual({});
    expect(r.state.files).toEqual({ "x.txt": "1" });
  });

  it("git restore --staged . mengeluarkan semua", () => {
    let s = write(write(base(), "a.txt", "a2"), "c.txt", "c");
    s = run(s, "git add .");
    const r = exec(s, "git restore --staged .");
    expect(r.state.index).toEqual({ "a.txt": "a1", "b.txt": "b1" });
  });

  it("path tidak dikenal", () => {
    expect(keys(exec(base(), "git restore --staged nope"))).toEqual(["restore.unknownPath"]);
  });
});

describe("saat merge atau rebase berjalan", () => {
  it("ditolak saat merge", () => {
    const merging = { ...base(), mergeState: { from: "x", fromCommit: "abc", conflicts: ["a.txt"] } } as RepoState;
    expect(keys(exec(merging, "git restore a.txt"))).toEqual(["merge.inProgress"]);
  });

  it("ditolak saat rebase", () => {
    const rebasing = {
      ...base(),
      rebaseState: { branch: "main", onto: "x", originalTip: "y", current: null, remaining: [], conflicts: [] },
    } as RepoState;
    expect(keys(exec(rebasing, "git restore --staged a.txt"))).toEqual(["rebase.inProgress"]);
  });
});
