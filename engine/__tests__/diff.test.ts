import { describe, expect, it } from "vitest";
import { exec, initRepo, keys, paramsOf, rawText, run, write } from "./helpers";
import type { RepoState } from "../types";

function base(): RepoState {
  let s = initRepo({ "app.js": "a\nb" });
  s = run(s, "git add .");
  return run(s, 'git commit -m "first"');
}

const APP_DIFF = "diff --git a/app.js b/app.js\n--- a/app.js\n+++ b/app.js\n@@ -1,2 +1,2 @@\n a\n-b\n+B";

describe("git diff (working vs staging)", () => {
  it("menampilkan perubahan yang belum di-stage", () => {
    const s = write(base(), "app.js", "a\nB");
    const r = exec(s, "git diff");
    expect(r.ok).toBe(true);
    expect(keys(r)).toEqual(["diff.unstaged"]);
    expect(rawText(r)).toBe(APP_DIFF);
    expect(r.state).toBe(s);
    expect(r.events).toEqual([{ type: "diff-ditampilkan", staged: false }]);
  });

  it("memberi gaya pada header, baris hapus, dan baris tambah", () => {
    const r = exec(write(base(), "app.js", "a\nB"), "git diff");
    const styles = r.output.flatMap((l) => ("raw" in l ? [l.style ?? null] : []));
    expect(styles).toEqual(["meta", "meta", "meta", "meta", null, "del", "add"]);
  });

  it("setelah di-stage, git diff kosong tapi menyebut --staged", () => {
    const s = run(write(base(), "app.js", "a\nB"), "git add app.js");
    const r = exec(s, "git diff");
    expect(r.ok).toBe(true);
    expect(keys(r)).toEqual(["diff.noneUnstagedButStaged"]);
    expect(rawText(r)).toBe("");
  });

  it("repo bersih", () => {
    expect(keys(exec(base(), "git diff"))).toEqual(["diff.noneUnstaged"]);
  });

  it("tidak mengklaim semuanya sama bila ada file tak terlacak", () => {
    expect(keys(exec(write(base(), "new.txt", "x"), "git diff"))).toEqual(["diff.noneButUntracked"]);
  });

  it("git diff . berarti semua file", () => {
    const s = write(base(), "app.js", "a\nB");
    const r = exec(s, "git diff .");
    expect(r.ok).toBe(true);
    expect(rawText(r)).toBe(APP_DIFF);
  });

  it("filter file", () => {
    let s = initRepo({ "app.js": "a", "b.js": "b" });
    s = run(run(s, "git add ."), 'git commit -m "first"');
    s = write(write(s, "app.js", "a2"), "b.js", "b2");
    const r = exec(s, "git diff app.js");
    expect(rawText(r)).toContain("a/app.js");
    expect(rawText(r)).not.toContain("b.js");
  });

  it("file tak terlacak yang disebut tidak ditampilkan, dengan saran", () => {
    const s = write(base(), "new.txt", "x");
    const r = exec(s, "git diff new.txt");
    expect(r.ok).toBe(true);
    expect(keys(r)).toEqual(["diff.untracked"]);
    expect(paramsOf(r, "diff.untracked")).toEqual({ file: "new.txt" });
  });

  it("path tidak dikenal", () => {
    const s = base();
    const r = exec(s, "git diff nope.txt");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["diff.unknownPath"]);
    expect(rawText(r)).toBe("fatal: ambiguous argument 'nope.txt': unknown revision or path not in the working tree.");
    expect(r.state).toBe(s);
  });

  it("saat merge konflik, file berpenanda tampil apa adanya", () => {
    let s = base();
    s = run(s, "git switch -c feature");
    s = run(write(s, "app.js", "feature"), "git add app.js");
    s = run(s, 'git commit -m "f"');
    s = run(s, "git switch main");
    s = run(write(s, "app.js", "main"), "git add app.js");
    s = run(s, 'git commit -m "m"');
    s = exec(s, "git merge feature").state;
    expect(s.mergeState).not.toBeNull();
    const r = exec(s, "git diff");
    expect(r.ok).toBe(true);
    expect(rawText(r)).toContain("+<<<<<<< HEAD");
    expect(r.state).toBe(s);
  });
});

describe("git diff --staged / --cached (staging vs HEAD)", () => {
  it.each(["git diff --staged", "git diff --cached"])("%s menampilkan perubahan yang di-stage", (input) => {
    const s = run(write(base(), "app.js", "a\nB"), "git add app.js");
    const r = exec(s, input);
    expect(keys(r)).toEqual(["diff.staged"]);
    expect(rawText(r)).toBe(APP_DIFF);
    expect(r.events).toEqual([{ type: "diff-ditampilkan", staged: true }]);
  });

  it("file baru tampil sebagai tambahan", () => {
    const s = run(write(base(), "new.txt", "x"), "git add new.txt");
    expect(rawText(exec(s, "git diff --staged"))).toBe(
      "diff --git a/new.txt b/new.txt\nnew file mode 100644\n--- /dev/null\n+++ b/new.txt\n@@ -0,0 +1,1 @@\n+x",
    );
  });

  it("repo tanpa commit: semua file di staging adalah file baru", () => {
    const s = run(initRepo({ "x.txt": "1\n2" }), "git add x.txt");
    const r = exec(s, "git diff --staged");
    expect(keys(r)).toEqual(["diff.staged"]);
    expect(rawText(r)).toContain("@@ -0,0 +1,2 @@");
  });

  it("tanpa perubahan di staging", () => {
    expect(keys(exec(base(), "git diff --staged"))).toEqual(["diff.noneStaged"]);
  });
});

describe("opsi", () => {
  it("log --graph tetap belum didukung", () => {
    expect(keys(exec(base(), "git log --graph"))).toEqual(["flag.unsupported"]);
  });
});
