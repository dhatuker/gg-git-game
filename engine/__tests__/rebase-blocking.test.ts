import { describe, expect, it } from "vitest";
import type { RepoState } from "../types";
import { exec, initRepo, keys, paramsOf, run, write } from "./helpers";

function commitFile(state: RepoState, file: string, content: string, msg: string): RepoState {
  return run(run(write(state, file, content), "git add ."), `git commit -m "${msg}"`);
}

/** Rebase feature ke main yang berhenti karena konflik di a.txt. */
function stoppedRebase(): RepoState {
  let s = commitFile(initRepo(), "a.txt", "1", "c1");
  s = run(s, "git switch -c feature");
  s = commitFile(s, "a.txt", "feature", "f1");
  s = run(s, "git switch main");
  s = commitFile(s, "a.txt", "main", "m1");
  s = run(s, "git switch feature");
  return run(s, "git rebase main");
}

describe("pemblokiran saat rebase berhenti", () => {
  it("perintah yang mengubah riwayat atau HEAD ditolak dengan rebase.inProgress", () => {
    const s = stoppedRebase();
    const c1 = s.commits[s.branches.main].parents[0];
    const commands = [
      'git commit -m "x"',
      "git switch main",
      "git switch -c baru",
      "git checkout main",
      "git merge main",
      "git reset --hard HEAD",
      `git revert ${c1}`,
      `git cherry-pick ${c1}`,
      "git stash",
      "git rebase main",
      "git rebase",
    ];
    for (const cmd of commands) {
      const r = exec(s, cmd);
      expect(r.ok, cmd).toBe(false);
      expect(keys(r), cmd).toEqual(["rebase.inProgress"]);
      expect(r.state, cmd).toBe(s);
      expect(r.events, cmd).toEqual([]);
    }
  });

  it("commit tetap ditolak walau konflik sudah di-add", () => {
    const s = run(write(stoppedRebase(), "a.txt", "fixed"), "git add a.txt");
    const r = exec(s, 'git commit -m "x"');
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["rebase.inProgress"]);
    expect(r.state).toBe(s);
  });

  it("status, add, log, dan branch tetap jalan", () => {
    const s = stoppedRebase();
    for (const cmd of ["git status", "git log", "git branch"]) {
      expect(exec(s, cmd).ok, cmd).toBe(true);
    }
    const added = exec(write(s, "a.txt", "fixed"), "git add a.txt");
    expect(added.ok).toBe(true);
    expect(added.state.rebaseState?.conflicts).toEqual([]);
  });

  it("status menampilkan baris rebase setelah baris HEAD", () => {
    const s = stoppedRebase();
    const r = exec(s, "git status");
    expect(keys(r).slice(0, 3)).toEqual(["status.detached", "status.rebaseInProgress", "status.conflicts"]);
    expect(paramsOf(r, "status.rebaseInProgress")).toEqual({ branch: "feature" });
  });

  it("status tetap menampilkan clean saat rebase tanpa perubahan tersisa", () => {
    const s = run(write(stoppedRebase(), "a.txt", "main"), "git add a.txt");
    expect(keys(exec(s, "git status"))).toEqual(["status.detached", "status.rebaseInProgress", "status.clean"]);
  });

  it("status tanpa rebase tidak menampilkan baris rebase", () => {
    const s = commitFile(initRepo(), "a.txt", "1", "c1");
    expect(keys(exec(s, "git status"))).not.toContain("status.rebaseInProgress");
  });
});
