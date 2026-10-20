import { describe, expect, it } from "vitest";
import { attachRemote, exec, initRepo, keys, paramsOf, rawText, run, teammateCommit, write } from "./helpers";
import { copyMissing } from "../commands/transfer";
import type { RepoState } from "../types";

function base(): RepoState {
  let s = initRepo();
  s = write(s, "a.txt", "1");
  s = run(s, "git add a.txt");
  s = run(s, 'git commit -m "satu"');
  return attachRemote(s);
}

describe("copyMissing", () => {
  it("menyalin tepat commit yang belum ada tanpa mengubah argumen", () => {
    const s = base();
    const t = teammateCommit(s, "b.txt", "x", "teman");
    const tip = t.remote!.branches.main;
    const targetBefore = { ...s.commits };
    const sourceBefore = { ...t.remote!.commits };
    const out = copyMissing(t.remote!.commits, s.commits, tip);
    expect(Object.keys(out).sort()).toEqual([...Object.keys(s.commits), tip].sort());
    expect(s.commits).toEqual(targetBefore);
    expect(t.remote!.commits).toEqual(sourceBefore);
    expect(out).not.toBe(s.commits);
  });
});

describe("git fetch", () => {
  it("menyalin commit teman dan menggeser origin/main saja", () => {
    const s = teammateCommit(base(), "b.txt", "x", "teman");
    const tip = s.remote!.branches.main;
    const old = s.remoteRefs.main;
    const r = exec(s, "git fetch");
    expect(r.ok).toBe(true);
    expect(r.state.commits[tip]).toBeDefined();
    expect(r.state.remoteRefs.main).toBe(tip);
    expect(r.state.branches).toEqual(s.branches);
    expect(r.state.files).toEqual(s.files);
    expect(r.state.index).toEqual(s.index);
    expect(r.events).toEqual([{ type: "fetch-selesai", from: old, to: tip }]);
    expect(keys(r)).toContain("fetch.done");
  });
  it("git fetch origin juga diterima", () => {
    const s = teammateCommit(base(), "b.txt", "x", "teman");
    expect(exec(s, "git fetch origin").ok).toBe(true);
  });
  it("tanpa yang baru: upToDate tanpa event", () => {
    const r = exec(base(), "git fetch");
    expect(r.ok).toBe(true);
    expect(keys(r)).toEqual(["fetch.upToDate"]);
    expect(r.events).toEqual([]);
  });
  it("jalan dari HEAD terlepas", () => {
    let s = teammateCommit(base(), "b.txt", "x", "teman");
    s = run(s, `git checkout ${s.branches.main}`);
    expect(exec(s, "git fetch").ok).toBe(true);
  });
  it("remote null atau tidak terhubung", () => {
    const s = initRepo();
    for (const st of [s, { ...base(), remote: { ...base().remote!, connected: false } }]) {
      const r = exec(st, "git fetch");
      expect(r.ok).toBe(false);
      expect(r.state).toBe(st);
      expect(keys(r)).toEqual(["remote.noRepo"]);
      expect(rawText(r)).toBe("fatal: 'origin' does not appear to be a git repository");
    }
  });
  it("flag ditolak", () => {
    for (const f of ["--all", "-p"]) {
      const s = base();
      const r = exec(s, `git fetch ${f}`);
      expect(r.ok).toBe(false);
      expect(r.state).toBe(s);
      expect(keys(r)).toEqual(["fetch.badFlag"]);
    }
  });
  it("argumen lain ditolak", () => {
    const r = exec(base(), "git fetch upstream");
    expect(keys(r)).toEqual(["fetch.badFlag"]);
  });
  it("ditolak saat merge/rebase berjalan", () => {
    const s = { ...base(), mergeState: { from: "x", fromCommit: "y", conflicts: [] } };
    const r = exec(s, "git fetch");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(keys(r)).toEqual(["merge.inProgress"]);
  });
});

describe("git push", () => {
  function ahead(): RepoState {
    let s = base();
    s = write(s, "c.txt", "2");
    s = run(s, "git add c.txt");
    s = run(s, 'git commit -m "dua"');
    s = write(s, "d.txt", "3");
    s = run(s, "git add d.txt");
    return run(s, 'git commit -m "tiga"');
  }
  it("fast-forward menyalin tepat commit lokal yang belum ada", () => {
    const s = ahead();
    const tip = s.branches.main;
    const r = exec(s, "git push");
    expect(r.ok).toBe(true);
    expect(r.state.remote!.branches.main).toBe(tip);
    expect(r.state.remoteRefs.main).toBe(tip);
    expect(Object.keys(r.state.remote!.commits).sort()).toEqual(Object.keys(s.commits).sort());
    expect(r.events).toEqual([{ type: "push-berhasil", from: s.remote!.branches.main, to: tip, count: 2 }]);
    expect(paramsOf(r, "push.done")).toMatchObject({ count: 2 });
    expect(r.state.branches).toEqual(s.branches);
  });
  it("git push origin main diterima; origin saja juga", () => {
    expect(exec(ahead(), "git push origin main").ok).toBe(true);
    expect(exec(ahead(), "git push origin").ok).toBe(true);
  });
  it("sama persis: upToDate", () => {
    const r = exec(base(), "git push");
    expect(r.ok).toBe(true);
    expect(keys(r)).toEqual(["push.upToDate"]);
    expect(r.events).toEqual([]);
  });
  it("remote punya commit yang belum di-fetch: fetch-first", () => {
    const s = teammateCommit(ahead(), "b.txt", "x", "teman");
    const r = exec(s, "git push");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(r.events).toEqual([]);
    expect(keys(r)).toEqual(["push.rejected"]);
    expect(paramsOf(r, "push.rejected")).toEqual({ reason: "fetch-first" });
    expect(rawText(r)).toContain("! [rejected] main -> main (fetch first)");
  });
  it("sudah di-fetch tetapi bercabang: non-fast-forward", () => {
    let s = teammateCommit(ahead(), "b.txt", "x", "teman");
    s = run(s, "git fetch");
    const r = exec(s, "git push");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(r.events).toEqual([]);
    expect(paramsOf(r, "push.rejected")).toEqual({ reason: "non-fast-forward" });
    expect(rawText(r)).toContain("! [rejected] main -> main (non-fast-forward)");
  });
  it("branch lain, HEAD terlepas, atau bukan main: onlyMain", () => {
    const s = ahead();
    expect(keys(exec(s, "git push origin feature"))).toEqual(["push.onlyMain"]);
    expect(keys(exec(s, "git push upstream main"))).toEqual(["push.onlyMain"]);
    const b = run(s, "git switch -c feature");
    const rb = exec(b, "git push");
    expect(keys(rb)).toEqual(["push.onlyMain"]);
    expect(rb.state).toBe(b);
    const d = run(s, `git checkout ${s.branches.main}`);
    expect(keys(exec(d, "git push"))).toEqual(["push.onlyMain"]);
  });
  it("flag ditolak", () => {
    for (const f of ["--force", "-f", "-u", "--set-upstream"]) {
      const s = ahead();
      const r = exec(s, `git push ${f}`);
      expect(r.ok).toBe(false);
      expect(r.state).toBe(s);
      expect(keys(r)).toEqual(["push.badFlag"]);
    }
  });
  it("belum ada commit", () => {
    const s = attachRemote(initRepo());
    const r = exec(s, "git push");
    expect(keys(r)).toEqual(["push.noCommits"]);
    expect(r.state).toBe(s);
  });
  it("remote null: remote.noRepo", () => {
    const s = initRepo();
    const r = exec(s, "git push");
    expect(keys(r)).toEqual(["remote.noRepo"]);
    expect(r.state).toBe(s);
    expect(rawText(r)).toBe("fatal: 'origin' does not appear to be a git repository");
  });
  it("ditolak saat rebase/merge berjalan", () => {
    const s = { ...ahead(), mergeState: { from: "x", fromCommit: "y", conflicts: [] } };
    expect(keys(exec(s, "git push"))).toEqual(["merge.inProgress"]);
  });
});
