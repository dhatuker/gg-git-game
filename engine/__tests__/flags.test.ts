import { describe, expect, it } from "vitest";
import { exec, initRepo, keys, paramsOf, rawText, run, write } from "./helpers";
import type { RepoState } from "../types";

/** Repo dengan satu commit berisi a.txt dan b.txt. */
function base(): RepoState {
  let s = initRepo({ "a.txt": "a1", "b.txt": "b1" });
  s = run(s, "git add .");
  return run(s, 'git commit -m "first"');
}

/** main dan feature sama-sama mengubah a.txt → merge feature berakhir konflik. */
function conflicted(): RepoState {
  let s = base();
  s = run(s, "git switch -c feature");
  s = write(s, "a.txt", "feature");
  s = run(s, "git add a.txt");
  s = run(s, 'git commit -m "feature change"');
  s = run(s, "git switch main");
  s = write(s, "a.txt", "main");
  s = run(s, "git add a.txt");
  s = run(s, 'git commit -m "main change"');
  const r = exec(s, "git merge feature");
  expect(r.state.mergeState?.conflicts).toEqual(["a.txt"]);
  return r.state;
}

describe("opsi yang belum didukung", () => {
  it.each([
    ["git log -n 1", "-n", "log"],
    ["git add -p", "-p", "add"],
    ["git switch -b x", "-b", "switch"],
    ["git rebase -i main", "-i", "rebase"],
    ['git commit -m "x" --amend', "--amend", "commit"],
    ["git commit -ax", "-ax", "commit"],
  ])("%s → pesan opsi tidak didukung, state tidak berubah", (input, flag, cmd) => {
    const s = base();
    const r = exec(s, input);
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["flag.unsupported"]);
    expect(paramsOf(r, "flag.unsupported")).toMatchObject({ flag, cmd });
    expect(r.state).toBe(s);
  });

  it("menyebut opsi yang tersedia", () => {
    const r = exec(base(), "git log -n 1");
    expect(paramsOf(r, "flag.unsupported")?.options).toBe("`--oneline`");
  });

  it("perintah tanpa opsi memakai pesan tersendiri", () => {
    expect(keys(exec(base(), "git status -s"))).toEqual(["flag.unsupportedNone"]);
    const r = exec(base(), "git revert --no-edit HEAD");
    expect(keys(r)).toEqual(["flag.unsupportedNone"]);
    expect(paramsOf(r, "flag.unsupportedNone")).toEqual({ flag: "--no-edit", cmd: "revert" });
  });

  it("isi pesan commit yang diawali tanda minus bukan opsi", () => {
    let s = write(base(), "a.txt", "a2");
    s = run(s, "git add a.txt");
    const r = exec(s, 'git commit -m "-fix typo"');
    expect(r.ok).toBe(true);
    expect(rawText(r)).toContain("-fix typo");
  });

  it("perintah yang memeriksa opsinya sendiri tetap memakai pesannya", () => {
    expect(keys(exec(base(), "git reset --keep"))).toEqual(["reset.badFlag"]);
  });

  it("checkout tetap menerima -b", () => {
    expect(exec(base(), "git checkout -b x").ok).toBe(true);
  });
});

describe("git add -A / --all", () => {
  it.each(["git add -A", "git add --all"])("%s men-stage semua file seperti git add .", (input) => {
    let s = write(base(), "a.txt", "a2");
    s = write(s, "c.txt", "c1");
    const r = exec(s, input);
    expect(r.ok).toBe(true);
    expect(r.state.index).toEqual({ "a.txt": "a2", "b.txt": "b1", "c.txt": "c1" });
    expect(r.state.index).toEqual(exec(s, "git add .").state.index);
  });
});

describe("git commit -a", () => {
  it.each(['git commit -am "both"', 'git commit -a -m "both"', 'git commit -m "both" -a'])(
    "%s men-stage file terlacak yang berubah lalu commit",
    (input) => {
      let s = write(base(), "a.txt", "a2");
      s = write(s, "new.txt", "n");
      const r = exec(s, input);
      expect(r.ok).toBe(true);
      const tip = r.state.commits[r.state.branches.main];
      expect(tip.message).toBe("both");
      expect(tip.snapshot).toEqual({ "a.txt": "a2", "b.txt": "b1" });
      // File baru (untracked) tidak ikut, sama seperti git sungguhan.
      expect(r.state.index["new.txt"]).toBeUndefined();
      expect(r.events.map((e) => e.type)).toEqual(["file-di-stage", "commit-dibuat"]);
    },
  );

  it("tanpa perubahan terlacak tetap gagal karena tidak ada yang di-stage", () => {
    const s = write(base(), "new.txt", "n");
    const r = exec(s, 'git commit -am "x"');
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["commit.nothingStaged"]);
    expect(r.state).toBe(s);
  });

  it("-a tanpa -m tetap meminta pesan", () => {
    const r = exec(write(base(), "a.txt", "a2"), "git commit -a");
    expect(keys(r)).toEqual(["commit.needMessage"]);
  });

  it("saat konflik merge belum selesai, -a tidak menandai konflik sebagai selesai", () => {
    const s = conflicted();
    const r = exec(s, 'git commit -am "merge"');
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["commit.conflictsRemain"]);
    expect(r.state).toBe(s);
  });
});

describe("git merge --abort", () => {
  it("membatalkan merge yang konflik dan mengembalikan file", () => {
    const s = conflicted();
    const untracked = write(s, "notes.txt", "keep me");
    const r = exec(untracked, "git merge --abort");
    expect(r.ok).toBe(true);
    expect(keys(r)).toEqual(["merge.aborted"]);
    expect(r.state.mergeState).toBeNull();
    expect(r.state.index).toEqual({ "a.txt": "main", "b.txt": "b1" });
    expect(r.state.files).toEqual({ "a.txt": "main", "b.txt": "b1", "notes.txt": "keep me" });
    expect(r.state.branches).toEqual(s.branches);
    expect(r.events).toEqual([{ type: "merge-dibatalkan", branch: "feature" }]);
  });

  it("gagal bila tidak ada merge yang berjalan", () => {
    const s = base();
    const r = exec(s, "git merge --abort");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["merge.nothingToAbort"]);
    expect(r.state).toBe(s);
  });
});

describe("git branch -D", () => {
  function withUnmerged(): RepoState {
    let s = run(base(), "git switch -c feature");
    s = write(s, "a.txt", "f");
    s = run(s, "git add a.txt");
    s = run(s, 'git commit -m "wip"');
    return run(s, "git switch main");
  }

  it("menghapus branch yang belum di-merge", () => {
    const s = withUnmerged();
    expect(keys(exec(s, "git branch -d feature"))).toEqual(["branch.notMerged"]);
    const r = exec(s, "git branch -D feature");
    expect(r.ok).toBe(true);
    expect(keys(r)).toEqual(["branch.forceDeleted"]);
    expect(r.state.branches.feature).toBeUndefined();
    expect(r.events).toEqual([{ type: "branch-dihapus", name: "feature" }]);
  });

  it("tetap tidak bisa menghapus branch yang sedang dipakai", () => {
    const r = exec(run(withUnmerged(), "git switch feature"), "git branch -D feature");
    expect(keys(r)).toEqual(["branch.deleteCurrent"]);
  });

  it("branch yang tidak ada", () => {
    expect(keys(exec(base(), "git branch -D nope"))).toEqual(["branch.notFound"]);
  });

  it("tanpa nama", () => {
    expect(keys(exec(base(), "git branch -D"))).toEqual(["branch.deleteNeedsName"]);
  });
});
