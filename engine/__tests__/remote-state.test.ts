import { describe, expect, it } from "vitest";
import { connectedRemote, createEmptyRepo, unreachableCommits } from "../state";
import { createCommit } from "../commands/commit";
import { attachRemote, initRepo, run, teammateCommit, write } from "./helpers";

function base() {
  return run(run(write(initRepo(), "a.txt", "1"), "git add ."), 'git commit -m "c1"');
}

describe("state remote", () => {
  it("createEmptyRepo: remote null dan remoteRefs kosong", () => {
    const s = createEmptyRepo();
    expect(s.remote).toBeNull();
    expect(s.remoteRefs).toEqual({});
  });

  it("connectedRemote", () => {
    const s = base();
    expect(connectedRemote(s)).toBeNull();
    const r = attachRemote(s);
    expect(connectedRemote(r)).toBe(r.remote);
    expect(connectedRemote({ ...r, remote: { ...r.remote!, connected: false } })).toBeNull();
  });

  it("unreachableCommits memakai remoteRefs sebagai root", () => {
    const s = base();
    const tip = s.branches.main;
    const detached = { ...s, branches: {}, head: { type: "detached" as const, id: "zzzzzzz" } };
    expect(unreachableCommits({ ...detached, remoteRefs: { main: tip } })).toEqual([]);
    expect(unreachableCommits({ ...detached, remoteRefs: {} })).toEqual([tip]);
  });

  it("createCommit: seq dari gabungan commit lokal dan remote", () => {
    const s = teammateCommit(attachRemote(base()), "b.txt", "x", "teman");
    const friend = s.remote!.commits[s.remote!.branches.main];
    expect(friend.seq).toBe(1);
    expect(Object.keys(s.commits)).not.toContain(friend.id);
    const made = createCommit({ ...s, index: { a: "2" } }, "lokal", [s.branches.main]);
    expect(made.commit.seq).toBe(friend.seq + 1);
  });

  it("teammateCommit hanya mengubah remote", () => {
    const s = attachRemote(base());
    const t = teammateCommit(s, "b.txt", "x", "teman");
    expect({ ...t, remote: null }).toEqual({ ...s, remote: null });
    const tip = t.remote!.branches.main;
    expect(t.remote!.commits[tip].parents).toEqual([s.remote!.branches.main]);
    expect(t.remote!.commits[tip].snapshot).toEqual({ "a.txt": "1", "b.txt": "x" });
  });
});
