import { describe, expect, it } from "vitest";
import { writeFile } from "../files";
import { exec, initRepo, keys, paramsOf, rawText, write } from "./helpers";

describe("writeFile", () => {
  it("menolak nama file tidak valid tanpa mengubah state", () => {
    const repo = initRepo();
    const r = writeFile(repo, "a b", "x");
    expect(r.error?.key).toBe("files.invalidName");
    expect(r.state).toBe(repo);
  });

  it("menolak nama file kosong", () => {
    expect(writeFile(initRepo(), "", "x").error?.key).toBe("files.invalidName");
  });
});

describe("git status", () => {
  it("menampilkan file belum dilacak", () => {
    const repo = write(initRepo(), "a.txt", "halo");
    const r = exec(repo, "git status");
    expect(keys(r)).toEqual(["status.onBranch", "status.untracked"]);
    expect(paramsOf(r, "status.onBranch")?.branch).toBe("main");
    expect(rawText(r)).toContain("    a.txt");
  });

  it("menampilkan perubahan yang belum di-stage", () => {
    let repo = write(initRepo(), "a.txt", "halo");
    repo = exec(repo, "git add a.txt").state;
    repo = write(repo, "a.txt", "halo lagi");
    expect(keys(exec(repo, "git status"))).toContain("status.unstaged");
  });

  it("menampilkan perubahan yang akan di-commit", () => {
    let repo = write(initRepo(), "a.txt", "halo");
    repo = exec(repo, "git add a.txt").state;
    const k = keys(exec(repo, "git status"));
    expect(k).toContain("status.staged");
    expect(k).not.toContain("status.untracked");
  });

  it("melaporkan working tree bersih", () => {
    const r = exec(initRepo(), "git status");
    expect(keys(r)).toEqual(["status.onBranch", "status.clean"]);
    expect(rawText(r)).toContain("nothing to commit, working tree clean");
  });

  it("menampilkan konflik saat merge berlangsung", () => {
    const repo = { ...write(initRepo(), "a.txt", "x"), mergeState: { from: "fitur", fromCommit: "abc", conflicts: ["a.txt"] } };
    expect(keys(exec(repo, "git status"))).toContain("status.conflicts");
  });
});

describe("git add", () => {
  it("men-stage satu file dan memberi event", () => {
    const repo = write(initRepo(), "a.txt", "halo");
    const r = exec(repo, "git add a.txt");
    expect(r.ok).toBe(true);
    expect(r.state.index["a.txt"]).toBe("halo");
    expect(r.events).toEqual([{ type: "file-di-stage", file: "a.txt" }]);
  });

  it("add . men-stage semua file yang berbeda saja", () => {
    let repo = write(write(initRepo(), "a.txt", "1"), "b.txt", "2");
    repo = exec(repo, "git add a.txt").state;
    const r = exec(repo, "git add .");
    expect(r.state.index).toEqual({ "a.txt": "1", "b.txt": "2" });
    expect(r.events).toEqual([{ type: "file-di-stage", file: "b.txt" }]);
  });

  it("menolak file yang tidak ada", () => {
    const r = exec(initRepo(), "git add nope.txt");
    expect(r.ok).toBe(false);
    expect(rawText(r)).toContain("did not match any files");
    expect(paramsOf(r, "add.missingFile")?.file).toBe("nope.txt");
  });

  it("menolak add tanpa argumen", () => {
    expect(exec(initRepo(), "git add").ok).toBe(false);
  });

  it("menghapus file dari daftar konflik saat di-add", () => {
    const repo = { ...write(initRepo(), "a.txt", "beres"), mergeState: { from: "fitur", fromCommit: "abc", conflicts: ["a.txt"] } };
    const r = exec(repo, "git add a.txt");
    expect(r.ok).toBe(true);
    expect(r.state.mergeState?.conflicts).toEqual([]);
  });

  it("memberi tahu konflik selesai walau isi file sama dengan staging (pilih versi saya)", () => {
    const base = write(initRepo(), "a.txt", "punyaku");
    const staged = exec(base, "git add a.txt").state;
    const repo = { ...staged, mergeState: { from: "fitur", fromCommit: "abc", conflicts: ["a.txt"] } };
    const r = exec(repo, "git add a.txt");
    expect(keys(r)).toEqual(["add.conflictResolved", "add.allConflictsResolved"]);
    expect(paramsOf(r, "add.conflictResolved")?.files).toBe("a.txt");
  });

  it("tidak menyuruh commit selama masih ada konflik lain", () => {
    const repo = {
      ...write(write(initRepo(), "a.txt", "x"), "b.txt", "y"),
      mergeState: { from: "fitur", fromCommit: "abc", conflicts: ["a.txt", "b.txt"] },
    };
    const r = exec(repo, "git add a.txt");
    expect(keys(r)).toContain("add.conflictResolved");
    expect(paramsOf(r, "add.conflictsRemain")?.files).toBe("b.txt");
  });
});
