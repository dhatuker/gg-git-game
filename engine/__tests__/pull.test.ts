import { describe, expect, it } from "vitest";
import { attachRemote, exec, initRepo, keys, paramsOf, rawText, run, teammateCommit, write } from "./helpers";
import { aheadBehind } from "../state";
import { describeEvents } from "../../ui/caption";
import type { RepoState } from "../types";

function base(): RepoState {
  let s = initRepo();
  s = write(s, "a.txt", "1");
  s = run(s, "git add a.txt");
  s = run(s, 'git commit -m "satu"');
  return attachRemote(s);
}

function localCommit(s: RepoState, file: string, content: string, message: string): RepoState {
  s = write(s, file, content);
  s = run(s, `git add ${file}`);
  return run(s, `git commit -m "${message}"`);
}

describe("git pull", () => {
  it("menyalin commit teman lalu fast-forward", () => {
    const s = teammateCommit(base(), "b.txt", "x", "teman");
    const tip = s.remote!.branches.main;
    const old = s.remoteRefs.main;
    const r = exec(s, "git pull");
    expect(r.ok).toBe(true);
    expect(r.state.branches.main).toBe(tip);
    expect(r.state.remoteRefs.main).toBe(tip);
    expect(r.state.files["b.txt"]).toBe("x");
    expect(r.events.map((e) => e.type)).toEqual(["fetch-selesai", "merge-fast-forward"]);
    expect(r.events[0]).toEqual({ type: "fetch-selesai", from: old, to: tip });
    expect(keys(r)).toContain("merge.fastForward");
    expect(keys(r)).toContain("pull.fetched");
    expect(keys(r)).not.toContain("fetch.done");
    expect(paramsOf(r, "pull.fetched")).toEqual({ from: old, to: tip });
  });
  it("pull origin dan pull origin main diterima", () => {
    const s = teammateCommit(base(), "b.txt", "x", "teman");
    expect(exec(s, "git pull origin").ok).toBe(true);
    expect(exec(s, "git pull origin main").ok).toBe(true);
  });
  it("bercabang: merge commit berinduk [lokal, origin/main] dengan pesan url", () => {
    let s = teammateCommit(base(), "b.txt", "x", "teman");
    s = localCommit(s, "c.txt", "y", "lokal");
    const local = s.branches.main!;
    const remoteTip = s.remote!.branches.main;
    const r = exec(s, "git pull");
    expect(r.ok).toBe(true);
    const id = r.state.branches.main!;
    expect(r.state.commits[id].parents).toEqual([local, remoteTip]);
    expect(r.state.commits[id].message).toBe(`Merge branch 'main' of ${s.remote!.url}`);
    expect(r.events.map((e) => e.type)).toEqual(["fetch-selesai", "commit-dibuat", "merge-commit-dibuat"]);
  });
  it("caption akhir pull adalah caption merge", () => {
    const ff = exec(teammateCommit(base(), "b.txt", "x", "teman"), "git pull");
    expect(describeEvents(ff.events)?.key).toBe("caption.fastForward");
    let s = teammateCommit(base(), "b.txt", "x", "teman");
    s = localCommit(s, "c.txt", "y", "lokal");
    expect(describeEvents(exec(s, "git pull").events)?.key).toBe("caption.mergeCommit");
  });
  it("sudah terbaru tanpa perubahan", () => {
    const s = base();
    const r = exec(s, "git pull");
    expect(r.ok).toBe(true);
    expect(rawText(r)).toContain("Already up to date.");
    expect(r.events).toEqual([]);
    expect(r.state.branches).toEqual(s.branches);
  });
  it("lokal di depan: sudah terbaru", () => {
    const s = localCommit(base(), "c.txt", "y", "lokal");
    const r = exec(s, "git pull");
    expect(r.ok).toBe(true);
    expect(rawText(r)).toContain("Already up to date.");
  });
  it("konflik lalu diselesaikan menjadi merge commit berinduk origin/main", () => {
    let s = teammateCommit(base(), "a.txt", "teman", "teman ubah a");
    s = localCommit(s, "a.txt", "lokal", "lokal ubah a");
    const local = s.branches.main!;
    const remoteTip = s.remote!.branches.main;
    const r = exec(s, "git pull");
    expect(r.ok).toBe(true);
    expect(r.state.mergeState?.from).toBe("origin/main");
    expect(r.events.map((e) => e.type)).toEqual(["fetch-selesai", "konflik-terjadi"]);
    let t = write(r.state, "a.txt", "gabungan");
    t = run(t, "git add a.txt");
    t = run(t, 'git commit -m "selesai"');
    expect(t.mergeState).toBeNull();
    expect(t.commits[t.branches.main!].parents).toEqual([local, remoteTip]);
  });
  it("main tertinggal karena fetch manual tetap disatukan", () => {
    let s = teammateCommit(base(), "b.txt", "x", "teman");
    s = run(s, "git fetch");
    const r = exec(s, "git pull");
    expect(r.ok).toBe(true);
    expect(r.state.branches.main).toBe(s.remote!.branches.main);
    expect(r.events.map((e) => e.type)).toEqual(["merge-fast-forward"]);
  });
  it("perubahan belum di-commit ditolak dan fetch tidak disimpan", () => {
    let s = teammateCommit(base(), "b.txt", "x", "teman");
    s = write(s, "a.txt", "ubah");
    s = run(s, "git add a.txt");
    const r = exec(s, "git pull");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(keys(r)).toContain("state.dirty");
  });
  it("file tak terlacak yang tertimpa ditolak, state sama", () => {
    let s = teammateCommit(base(), "b.txt", "x", "teman");
    s = write(s, "b.txt", "milikku");
    const r = exec(s, "git pull");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
  });
  it("ditolak saat merge berjalan", () => {
    let s = teammateCommit(base(), "a.txt", "teman", "t");
    s = localCommit(s, "a.txt", "lokal", "l");
    const c = exec(s, "git pull").state;
    const r = exec(c, "git pull");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(c);
  });
  it("ditolak saat rebase berjalan", () => {
    const s = { ...base(), rebaseState: { branch: "main", onto: "x", originalTip: "y", current: null, remaining: [], conflicts: [] } };
    const r = exec(s, "git pull");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
  });
  it("HEAD terlepas, bukan di main, atau origin feature: onlyMain", () => {
    const s = base();
    const detached = run(s, `git checkout ${s.branches.main}`);
    const feature = run(run(s, "git branch feature"), "git switch feature");
    for (const [st, cmd] of [
      [detached, "git pull"],
      [feature, "git pull"],
      [s, "git pull origin feature"],
    ] as const) {
      const r = exec(st, cmd);
      expect(r.ok).toBe(false);
      expect(r.state).toBe(st);
      expect(keys(r)).toEqual(["pull.onlyMain"]);
    }
  });
  it("tanpa commit: noCommits", () => {
    const s = { ...initRepo(), remote: base().remote } as RepoState;
    const r = exec(s, "git pull");
    expect(keys(r)).toEqual(["pull.noCommits"]);
    expect(r.state).toBe(s);
  });
  it("--rebase, --ff-only dan flag lain: badFlag", () => {
    for (const f of ["--rebase", "--ff-only", "-r"]) {
      const s = base();
      const r = exec(s, `git pull ${f}`);
      expect(r.ok).toBe(false);
      expect(r.state).toBe(s);
      expect(keys(r)).toEqual(["pull.badFlag"]);
    }
  });
  it("remote null atau tidak terhubung: remote.noRepo", () => {
    for (const st of [initRepo(), { ...base(), remote: { ...base().remote!, connected: false } }]) {
      const r = exec(st, "git pull");
      expect(r.ok).toBe(false);
      expect(r.state).toBe(st);
      expect(keys(r)).toEqual(["remote.noRepo"]);
    }
  });
});

describe("aheadBehind", () => {
  it("null bila tidak terhubung, bukan di main, atau tanpa origin/main", () => {
    expect(aheadBehind(initRepo())).toBeNull();
    const s = base();
    expect(aheadBehind({ ...s, remote: { ...s.remote!, connected: false } })).toBeNull();
    expect(aheadBehind({ ...s, remoteRefs: {} })).toBeNull();
    expect(aheadBehind(run(s, `git checkout ${s.branches.main}`))).toBeNull();
  });
  it("menghitung dari commit lokal", () => {
    let s = base();
    expect(aheadBehind(s)).toEqual({ ahead: 0, behind: 0 });
    s = localCommit(s, "c.txt", "y", "l1");
    s = localCommit(s, "d.txt", "y", "l2");
    expect(aheadBehind(s)).toEqual({ ahead: 2, behind: 0 });
    const t = teammateCommit(base(), "b.txt", "x", "teman");
    const fetched = run(t, "git fetch");
    expect(aheadBehind(fetched)).toEqual({ ahead: 0, behind: 1 });
    const div = localCommit(fetched, "c.txt", "y", "l");
    expect(aheadBehind(div)).toEqual({ ahead: 1, behind: 1 });
  });
});

describe("status tracking line", () => {
  const order = (s: RepoState) => keys(exec(s, "git status"));
  it("up to date, ahead, behind, diverged", () => {
    const s = base();
    expect(order(s)).toEqual(["status.onBranch", "status.trackingUpToDate", "status.clean"]);
    const a = localCommit(localCommit(s, "c.txt", "y", "l1"), "d.txt", "y", "l2");
    expect(order(a)).toEqual(["status.onBranch", "status.trackingAhead", "status.clean"]);
    expect(paramsOf(exec(a, "git status"), "status.trackingAhead")).toEqual({ n: 2 });
    const f = run(teammateCommit(s, "b.txt", "x", "t"), "git fetch");
    expect(order(f)).toEqual(["status.onBranch", "status.trackingBehind", "status.clean"]);
    expect(paramsOf(exec(f, "git status"), "status.trackingBehind")).toEqual({ n: 1 });
    const d = localCommit(f, "c.txt", "y", "l");
    expect(paramsOf(exec(d, "git status"), "status.trackingDiverged")).toEqual({ ahead: 1, behind: 1 });
  });
  it("sebelum baris rebase", () => {
    const s = { ...base(), rebaseState: { branch: "main", onto: "x", originalTip: "y", current: null, remaining: [], conflicts: [] } };
    expect(order(s).slice(0, 3)).toEqual(["status.onBranch", "status.trackingUpToDate", "status.rebaseInProgress"]);
  });
  it("tidak muncul bila tidak terhubung atau HEAD bukan di main", () => {
    expect(order(initRepo())).not.toContain("status.trackingUpToDate");
    const s = base();
    const f = run(run(s, "git branch feature"), "git switch feature");
    expect(order(f).join()).not.toContain("tracking");
    const d = run(s, `git checkout ${s.branches.main}`);
    expect(order(d).join()).not.toContain("tracking");
  });
});
