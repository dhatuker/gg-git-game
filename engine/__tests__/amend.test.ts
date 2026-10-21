import { describe, expect, it } from "vitest";
import { getHeadCommitId, unreachableCommits } from "../state";
import type { RepoState } from "../types";
import { attachRemote, exec, initRepo, keys, paramsOf, rawText, run, write } from "./helpers";

/** "first" lalu "secnod" (salah ketik) yang mengubah a.txt. */
function base(): RepoState {
  let s = initRepo({ "a.txt": "a1" });
  s = run(run(s, "git add ."), 'git commit -m "first"');
  s = run(write(s, "a.txt", "a2"), "git add a.txt");
  return run(s, 'git commit -m "secnod"');
}

const head = (s: RepoState) => s.commits[getHeadCommitId(s) as string];
const firstId = (s: RepoState) => head(s).parents[0];

describe("git commit --amend", () => {
  it("-m mengganti commit terakhir dengan pesan baru dan parent yang sama", () => {
    const s = base();
    const old = getHeadCommitId(s) as string;
    const r = exec(s, 'git commit --amend -m "second"');
    expect(r.ok).toBe(true);
    const now = head(r.state);
    expect(now.id).not.toBe(old);
    expect(now.message).toBe("second");
    expect(now.parents).toEqual([firstId(s)]);
    expect(now.snapshot).toEqual(s.commits[old].snapshot);
    expect(keys(r)).toEqual(["commit.amended"]);
    expect(paramsOf(r, "commit.amended")).toEqual({ from: old, to: now.id });
    expect(rawText(r)).toBe(`[main ${now.id}] second`);
    expect(r.events.at(-1)).toEqual({ type: "commit-diperbaiki", from: old, to: now.id });
    expect(unreachableCommits(r.state)).toContain(old);
  });

  it("--no-edit memakai pesan lama dan isi staging terbaru", () => {
    const s = run(write(base(), "b.txt", "b"), "git add b.txt");
    const r = exec(s, "git commit --amend --no-edit");
    expect(r.ok).toBe(true);
    expect(head(r.state).message).toBe("secnod");
    expect(head(r.state).snapshot).toEqual({ "a.txt": "a2", "b.txt": "b" });
  });

  it("--no-edit tanpa perubahan tetap membuat commit baru", () => {
    const s = base();
    const r = exec(s, "git commit --amend --no-edit");
    expect(r.ok).toBe(true);
    expect(getHeadCommitId(r.state)).not.toBe(getHeadCommitId(s));
  });

  it("tanpa -m atau --no-edit meminta pesan", () => {
    const s = base();
    const r = exec(s, "git commit --amend");
    expect(keys(r)).toEqual(["commit.amendNeedsMessage"]);
    expect(r.state).toBe(s);
  });

  it("repo tanpa commit", () => {
    const s = run(initRepo({ "a.txt": "1" }), "git add a.txt");
    const r = exec(s, 'git commit --amend -m "x"');
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["commit.amendNothing"]);
    expect(rawText(r)).toBe("fatal: You have nothing to amend.");
  });

  it("-a men-stage file terlacak dulu", () => {
    const s = write(base(), "a.txt", "a3");
    const r = exec(s, 'git commit -a --amend -m "x"');
    expect(head(r.state).snapshot["a.txt"]).toBe("a3");
    expect(r.events.map((e) => e.type)).toEqual(["file-di-stage", "commit-diperbaiki"]);
  });

  it("merge commit tetap punya dua parent", () => {
    let s = base();
    s = run(s, "git switch -c feature");
    s = run(write(s, "f.txt", "f"), "git add f.txt");
    s = run(s, 'git commit -m "f"');
    s = run(s, "git switch main");
    s = run(write(s, "m.txt", "m"), "git add m.txt");
    s = run(s, 'git commit -m "m"');
    s = run(s, "git merge feature");
    expect(head(s).parents).toHaveLength(2);
    const r = exec(s, 'git commit --amend -m "Merge feature"');
    expect(head(r.state).parents).toEqual(head(s).parents);
  });

  it("HEAD terlepas tetap terlepas di commit baru", () => {
    let s = run(base(), `git switch ${firstId(base())}`);
    s = run(write(s, "d.txt", "d"), "git add d.txt");
    s = run(s, 'git commit -m "detached"');
    const r = exec(s, 'git commit --amend -m "detached fixed"');
    expect(r.state.head.type).toBe("detached");
    expect(head(r.state).message).toBe("detached fixed");
  });

  it("ditolak saat merge", () => {
    const merging = { ...base(), mergeState: { from: "x", fromCommit: "abc", conflicts: [] } } as RepoState;
    expect(keys(exec(merging, 'git commit --amend -m "x"'))).toEqual(["merge.inProgress"]);
  });

  it("ditolak saat rebase", () => {
    const rebasing = {
      ...base(),
      rebaseState: { branch: "main", onto: "x", originalTip: "y", current: null, remaining: [], conflicts: [] },
    } as RepoState;
    expect(keys(exec(rebasing, 'git commit --amend -m "x"'))).toEqual(["rebase.inProgress"]);
  });

  it("setelah push: commit lama masih ditunjuk origin/main dan push berikutnya ditolak", () => {
    const s = attachRemote(base());
    const old = getHeadCommitId(s) as string;
    const r = exec(s, 'git commit --amend -m "second"');
    expect(unreachableCommits(r.state)).not.toContain(old);
    const push = exec(r.state, "git push");
    expect(push.ok).toBe(false);
    expect(keys(push)).toEqual(["push.rejectedNonFastForward"]);
  });

  it("--no-edit tanpa --amend tetap butuh -m", () => {
    expect(keys(exec(write(base(), "a.txt", "z"), "git commit -a --no-edit"))).toEqual(["commit.needMessage"]);
  });
});
