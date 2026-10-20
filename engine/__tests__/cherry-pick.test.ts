import { describe, expect, it } from "vitest";
import type { RepoState } from "../types";
import { exec, initRepo, keys, paramsOf, run, write } from "./helpers";

function commitFile(state: RepoState, file: string, content: string, msg: string): RepoState {
  return run(run(write(state, file, content), "git add ."), `git commit -m "${msg}"`);
}

/** main: c1; fitur: c1 -> f1 (f.txt) -> f2 (g.txt); HEAD di main. */
function setup(): RepoState {
  let s = commitFile(initRepo(), "a.txt", "1", "c1");
  s = run(s, "git switch -c fitur");
  s = commitFile(s, "f.txt", "f", "f1");
  s = commitFile(s, "g.txt", "g", "f2");
  return run(s, "git switch main");
}

describe("git cherry-pick", () => {
  it("menyalin satu commit dari branch lain", () => {
    const s = setup();
    const src = s.commits[s.branches.fitur].parents[0];
    const old = s.branches.main;
    const r = exec(s, `git cherry-pick ${src}`);
    expect(r.ok).toBe(true);
    const head = r.state.commits[r.state.branches.main];
    expect(head.parents).toEqual([old]);
    expect(head.message).toBe("f1");
    expect(head.id).not.toBe(src);
    expect(r.state.files["f.txt"]).toBe("f");
    expect(r.state.files["g.txt"]).toBeUndefined();
    expect(r.state.branches.fitur).toBe(s.branches.fitur);
    expect(r.state.index).toEqual(head.snapshot);
    expect(r.events).toEqual([
      { type: "commit-dibuat", id: head.id, parents: [old] },
      { type: "cherry-pick-dibuat", id: head.id, source: src },
    ]);
    expect(paramsOf(r, "cherryPick.done")).toEqual({ id: head.id, source: src });
  });

  it("menolak cherry-pick yang sudah teraplikasi", () => {
    const s = setup();
    const src = s.commits[s.branches.fitur].parents[0];
    const once = run(s, `git cherry-pick ${src}`);
    const r = exec(once, `git cherry-pick ${src}`);
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["cherryPick.empty"]);
    expect(r.state).toEqual(once);
  });

  it("menolak bila konflik", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = run(s, "git switch -c fitur");
    s = commitFile(s, "a.txt", "fitur", "f1");
    s = run(s, "git switch main");
    s = commitFile(s, "a.txt", "main", "m1");
    const r = exec(s, "git cherry-pick fitur");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["cherryPick.conflict"]);
    expect(paramsOf(r, "cherryPick.conflict")).toEqual({ files: "a.txt" });
    expect(r.state).toEqual(s);
  });

  it("menolak merge commit", () => {
    let s = commitFile(initRepo(), "a.txt", "1", "c1");
    s = run(s, "git switch -c f");
    s = commitFile(s, "f.txt", "f", "cf");
    s = run(s, "git switch main");
    s = commitFile(s, "m.txt", "m", "cm");
    s = run(s, "git merge f");
    s = run(s, "git switch -c lain HEAD~1");
    const r = exec(s, "git cherry-pick main");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["cherryPick.isMerge"]);
    expect(r.state).toEqual(s);
  });

  it("berjalan di HEAD detached", () => {
    const s = setup();
    const src = s.commits[s.branches.fitur].parents[0];
    const detached = run(s, `git checkout ${s.branches.main}`);
    const r = exec(detached, `git cherry-pick ${src}`);
    expect(r.ok).toBe(true);
    expect(r.state.head.type).toBe("detached");
    const id = r.state.head.type === "detached" ? r.state.head.id : "";
    expect(r.state.commits[id].parents).toEqual([s.branches.main]);
    expect(r.state.branches.main).toBe(s.branches.main);
  });

  it("menolak working tree kotor, rev tidak valid, dan tanpa argumen", () => {
    const s = setup();
    expect(exec(write(s, "a.txt", "kotor"), "git cherry-pick fitur").ok).toBe(false);
    expect(exec(s, "git cherry-pick zzzz").ok).toBe(false);
    expect(keys(exec(s, "git cherry-pick"))).toEqual(["cherryPick.needTarget"]);
  });
});
