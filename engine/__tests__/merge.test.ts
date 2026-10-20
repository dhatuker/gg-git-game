import { describe, expect, it } from "vitest";
import { resolveConflict } from "../files";
import type { RepoState } from "../types";
import { attachRemote, exec, initRepo, keys, rawText, run, teammateCommit, write } from "./helpers";

function commitFile(state: RepoState, file: string, content: string, msg: string): RepoState {
  return run(run(write(state, file, content), "git add ."), `git commit -m "${msg}"`);
}

const base = () => commitFile(initRepo(), "README.md", "awal", "awal");

/** main tetap, fitur maju 1 commit, HEAD di main. */
function ffSetup(): RepoState {
  let s = run(base(), "git switch -c fitur");
  s = commitFile(s, "fitur.txt", "baru", "tambah fitur");
  return run(s, "git switch main");
}

/** main dan fitur bercabang. */
function divergedSetup(sameFile: boolean): RepoState {
  let s = run(base(), "git switch -c fitur");
  s = commitFile(s, sameFile ? "README.md" : "fitur.txt", "versi fitur", "di fitur");
  s = run(s, "git switch main");
  return commitFile(s, sameFile ? "README.md" : "main.txt", "versi main", "di main");
}

describe("git merge", () => {
  it("fast-forward memajukan pointer tanpa commit baru", () => {
    const s = ffSetup();
    const before = Object.keys(s.commits).length;
    const r = exec(s, "git merge fitur");
    expect(r.ok).toBe(true);
    expect(r.state.branches.main).toBe(r.state.branches.fitur);
    expect(Object.keys(r.state.commits)).toHaveLength(before);
    expect(r.state.files["fitur.txt"]).toBe("baru");
    expect(r.state.index["fitur.txt"]).toBe("baru");
    expect(r.events).toEqual([{ type: "merge-fast-forward", branch: "main", to: s.branches.fitur }]);
  });

  it("membuat merge commit dua parent bila cabang mengubah file berbeda", () => {
    const s = divergedSetup(false);
    const r = exec(s, "git merge fitur");
    expect(r.ok).toBe(true);
    const head = r.state.commits[r.state.branches.main];
    expect(head.parents).toEqual([s.branches.main, s.branches.fitur]);
    expect(head.message).toBe("Merge branch 'fitur'");
    expect(r.state.files["fitur.txt"]).toBe("versi fitur");
    expect(r.state.files["main.txt"]).toBe("versi main");
    expect(r.events.map((e) => e.type)).toEqual(["commit-dibuat", "merge-commit-dibuat"]);
  });

  it("berhenti dengan konflik bila file yang sama diubah berbeda", () => {
    const s = divergedSetup(true);
    const r = exec(s, "git merge fitur");
    expect(r.ok).toBe(true);
    expect(rawText(r)).toContain("CONFLICT (content): Merge conflict in README.md");
    expect(keys(r)).toEqual(["merge.conflict", "merge.conflictNext"]);
    expect(r.state.mergeState).toEqual({ from: "fitur", fromCommit: s.branches.fitur, conflicts: ["README.md"] });
    expect(r.state.files["README.md"]).toBe("<<<<<<< HEAD\nversi main\n=======\nversi fitur\n>>>>>>> fitur");
    expect(r.state.branches.main).toBe(s.branches.main);
    expect(r.events).toEqual([{ type: "konflik-terjadi", files: ["README.md"] }]);
  });

  it("menyelesaikan konflik lewat resolve, add, commit", () => {
    const s = divergedSetup(true);
    let st = exec(s, "git merge fitur").state;
    const res = resolveConflict(st, "README.md", "theirs");
    expect(res.error).toBeUndefined();
    expect(res.state.files["README.md"]).toBe("versi fitur");
    st = run(res.state, "git add README.md");
    const r = exec(st, 'git commit -m "Selesaikan konflik"');
    expect(r.ok).toBe(true);
    expect(r.state.mergeState).toBeNull();
    expect(r.state.commits[r.state.branches.main].parents).toHaveLength(2);
    expect(r.events.map((e) => e.type)).toContain("konflik-selesai");
  });

  it("resolveConflict ours mengambil versi HEAD dan menolak file yang tidak konflik", () => {
    const st = exec(divergedSetup(true), "git merge fitur").state;
    expect(resolveConflict(st, "README.md", "ours").state.files["README.md"]).toBe("versi main");
    expect(resolveConflict(st, "lain.txt", "ours").error?.key).toBe("files.notConflicted");
  });

  it("melaporkan sudah up to date", () => {
    const s = run(ffSetup(), "git merge fitur");
    const r = exec(s, "git merge fitur");
    expect(r.ok).toBe(true);
    expect(rawText(r)).toContain("Already up to date.");
    expect(r.events).toEqual([]);
    expect(rawText(exec(base(), "git merge main"))).toContain("Already up to date.");
  });

  it("menolak branch yang tidak ada", () => {
    const r = exec(base(), "git merge nope");
    expect(r.ok).toBe(false);
    expect(rawText(r)).toContain("not something we can merge");
  });

  it("menolak merge saat merge lain belum selesai", () => {
    const st = exec(divergedSetup(true), "git merge fitur").state;
    const r = exec(st, "git merge fitur");
    expect(r.ok).toBe(false);
    expect(rawText(r)).toContain("You have not concluded your merge");
  });

  it("menolak merge saat ada perubahan belum di-commit", () => {
    expect(exec(write(ffSetup(), "README.md", "kotor"), "git merge fitur").ok).toBe(false);
  });

  it("menolak merge tanpa argumen", () => {
    expect(exec(base(), "git merge").ok).toBe(false);
  });
});

/** Simulasi fetch: salin commit remote dan majukan origin/main. */
function fetched(s: RepoState): RepoState {
  const remote = s.remote!;
  return { ...s, commits: { ...s.commits, ...remote.commits }, remoteRefs: { ...remote.branches } };
}

describe("git merge origin/main", () => {
  it("fast-forward bila main tertinggal", () => {
    const s = fetched(teammateCommit(attachRemote(base()), "t.txt", "t", "teman"));
    const r = exec(s, "git merge origin/main");
    expect(r.ok).toBe(true);
    expect(r.events.some((e) => e.type === "merge-fast-forward")).toBe(true);
    expect(r.state.branches.main).toBe(s.remoteRefs.main);
  });

  it("membuat merge commit remote-tracking saat bercabang", () => {
    let s = fetched(teammateCommit(attachRemote(base()), "t.txt", "t", "teman"));
    s = commitFile(s, "m.txt", "m", "lokal");
    const r = exec(s, "git merge origin/main");
    expect(r.ok).toBe(true);
    const id = r.state.branches.main;
    expect(r.state.commits[id].message).toBe("Merge remote-tracking branch 'origin/main'");
    expect(r.state.commits[id].parents).toHaveLength(2);
  });

  it("konflik menyimpan from dan fromCommit", () => {
    let s = fetched(teammateCommit(attachRemote(base()), "README.md", "teman", "teman"));
    s = commitFile(s, "README.md", "lokal", "lokal");
    const r = exec(s, "git merge origin/main");
    expect(r.ok).toBe(true);
    expect(r.state.mergeState?.from).toBe("origin/main");
    expect(r.state.mergeState?.fromCommit).toBe(s.remoteRefs.main);
  });

  it("origin/missing tetap merge.notFound", () => {
    const s = attachRemote(base());
    const r = exec(s, "git merge origin/missing");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(rawText(r)).toContain("not something we can merge");
  });

  it("switch dan branch -d origin/main gagal tanpa mengubah state", () => {
    const s = attachRemote(base());
    const a = exec(s, "git switch origin/main");
    expect(a.ok).toBe(false);
    expect(a.state).toBe(s);
    const b = exec(s, "git branch -d origin/main");
    expect(b.ok).toBe(false);
    expect(b.state).toBe(s);
  });
});
