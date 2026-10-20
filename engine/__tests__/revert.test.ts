import { describe, expect, it } from "vitest";
import { isReachable } from "../state";
import type { RepoState } from "../types";
import { exec, initRepo, keys, paramsOf, run, write } from "./helpers";

function commitFile(state: RepoState, file: string, content: string, msg: string): RepoState {
  return run(run(write(state, file, content), "git add ."), `git commit -m "${msg}"`);
}

/** c1 (a=1) -> c2 (a=2) -> c3 (b=x) */
function history(): RepoState {
  let s = commitFile(initRepo(), "a.txt", "1", "c1");
  s = commitFile(s, "a.txt", "2", "c2");
  return commitFile(s, "b.txt", "x", "c3");
}

describe("git revert", () => {
  it("membatalkan commit di tengah dan mempertahankan perubahan lain", () => {
    const s = history();
    const target = s.commits[s.branches.main].parents[0];
    const old = s.branches.main;
    const r = exec(s, `git revert ${target}`);
    expect(r.ok).toBe(true);
    const head = r.state.commits[r.state.branches.main];
    expect(head.message).toBe('Revert "c2"');
    expect(head.parents).toEqual([old]);
    expect(r.state.files["a.txt"]).toBe("1");
    expect(r.state.files["b.txt"]).toBe("x");
    expect(r.state.index).toEqual(head.snapshot);
    expect(head.id).not.toBe(old);
    expect(isReachable(r.state, r.state.branches.main, old)).toBe(true);
    expect(r.events).toEqual([
      { type: "commit-dibuat", id: head.id, parents: [old] },
      { type: "revert-dibuat", id: head.id, reverted: target },
    ]);
    expect(keys(r)).toContain("revert.done");
    expect(paramsOf(r, "revert.done")).toEqual({ id: head.id, reverted: target });
  });

  it("revert commit pertama menghapus file yang dibuatnya", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = commitFile(s, "b.txt", "x", "c2");
    const root = s.commits[s.branches.main].parents[0];
    const r = exec(s, `git revert ${root}`);
    expect(r.ok).toBe(true);
    expect(r.state.files["a.txt"]).toBeUndefined();
    expect(r.state.files["b.txt"]).toBe("x");
  });

  it("menolak merge commit", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = run(s, "git switch -c f");
    s = commitFile(s, "f.txt", "f", "cf");
    s = run(s, "git switch main");
    s = commitFile(s, "m.txt", "m", "cm");
    s = run(s, "git merge f");
    const r = exec(s, "git revert HEAD");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["revert.isMerge"]);
    expect(r.state).toEqual(s);
  });

  it("menolak bila bentrok dengan perubahan lanjutan", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = commitFile(s, "a.txt", "2", "c2");
    s = commitFile(s, "a.txt", "3", "c3");
    const target = s.commits[s.branches.main].parents[0];
    const r = exec(s, `git revert ${target}`);
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["revert.conflict"]);
    expect(paramsOf(r, "revert.conflict")).toEqual({ files: "a.txt" });
    expect(r.state).toEqual(s);
  });

  it("menolak working tree kotor, rev tidak valid, tanpa argumen, dan repo kosong", () => {
    const s = history();
    const dirty = write(s, "a.txt", "kotor");
    expect(exec(dirty, "git revert HEAD").ok).toBe(false);
    expect(exec(dirty, "git revert HEAD").state).toEqual(dirty);
    expect(exec(s, "git revert zzzz").ok).toBe(false);
    expect(keys(exec(s, "git revert"))).toEqual(["revert.needTarget"]);
    expect(keys(exec(initRepo(), "git revert HEAD"))).toEqual(["revert.noCommits"]);
  });

  it("mempertahankan file tak terlacak", () => {
    const s = write(history(), "catatan.txt", "rahasia");
    const r = exec(s, "git revert HEAD");
    expect(r.ok).toBe(true);
    expect(r.state.files["catatan.txt"]).toBe("rahasia");
    expect(r.state.index["catatan.txt"]).toBeUndefined();
  });
});

describe("git revert tanpa perubahan", () => {
  it("revert commit yang sudah di-revert -> revert.empty, state tak berubah", () => {
    const s = history();
    const target = s.commits[s.branches.main].parents[0];
    const once = run(s, `git revert ${target}`);
    const r = exec(once, `git revert ${target}`);
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["revert.empty"]);
    expect(r.state).toBe(once);
  });
});
