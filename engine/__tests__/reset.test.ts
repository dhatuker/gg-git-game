import { describe, expect, it } from "vitest";
import { unreachableCommits } from "../state";
import type { RepoState } from "../types";
import { exec, initRepo, keys, paramsOf, rawText, run, write } from "./helpers";

function commitFile(state: RepoState, file: string, content: string, msg: string): RepoState {
  return run(run(write(state, file, content), "git add ."), `git commit -m "${msg}"`);
}

/** Tiga commit di main; app.js berbeda tiap commit. */
function history(): RepoState {
  let s = commitFile(initRepo(), "app.js", "v1", "satu");
  s = commitFile(s, "app.js", "v2", "dua");
  return commitFile(s, "app.js", "v3", "tiga");
}

describe("git reset", () => {
  it("soft memindah branch dan menjaga index dan files", () => {
    const s = run(write(history(), "app.js", "v4"), "git add app.js");
    const r = exec(s, "git reset --soft HEAD~1");
    expect(r.ok).toBe(true);
    expect(r.state.branches.main).toBe(s.commits[s.branches.main].parents[0]);
    expect(r.state.index).toEqual(s.index);
    expect(r.state.files).toEqual(s.files);
    expect(keys(r)).toEqual(["reset.soft"]);
    expect(r.events).toEqual([{ type: "reset-dilakukan", mode: "soft", from: s.branches.main, to: r.state.branches.main }]);
  });

  it("mixed (default atau eksplisit) mengosongkan staging tetapi file kerja utuh", () => {
    const s = history();
    for (const cmd of ["git reset HEAD~1", "git reset --mixed HEAD~1", "git reset HEAD~1 --mixed"]) {
      const r = exec(s, cmd);
      expect(r.ok).toBe(true);
      const target = s.commits[s.branches.main].parents[0];
      expect(r.state.branches.main).toBe(target);
      expect(r.state.index).toEqual(s.commits[target].snapshot);
      expect(r.state.files).toEqual(s.files);
      expect(keys(r)).toEqual(["reset.mixed"]);
    }
  });

  it("hard HEAD~2 menyamakan files dan index dengan target, menjaga file tak terlacak", () => {
    const s = write(history(), "catatan.txt", "bebas");
    const r = exec(s, "git reset --hard HEAD~2");
    expect(r.ok).toBe(true);
    const target = s.commits[s.commits[s.branches.main].parents[0]].parents[0];
    expect(r.state.branches.main).toBe(target);
    expect(r.state.files).toEqual({ "app.js": "v1", "catatan.txt": "bebas" });
    expect(r.state.index).toEqual({ "app.js": "v1" });
    expect(keys(r)).toEqual(["reset.hard"]);
    expect(paramsOf(r, "reset.hard")).toEqual({ to: target });
    expect(rawText(r)).toBe(`HEAD is now at ${target} satu`);
    expect(r.events).toEqual([{ type: "reset-dilakukan", mode: "hard", from: s.branches.main, to: target }]);
  });

  it("commit yang ditinggalkan tetap ada dan muncul sebagai unreachable", () => {
    const s = history();
    const r = exec(s, "git reset --hard HEAD~2");
    expect(Object.keys(r.state.commits)).toHaveLength(3);
    expect(unreachableCommits(r.state)).toEqual([s.branches.main, s.commits[s.branches.main].parents[0]]);
  });

  it("hard tanpa rev membuang perubahan yang belum di-commit", () => {
    const s = run(write(history(), "app.js", "kotor"), "git add app.js");
    const r = exec(s, "git reset --hard");
    expect(r.ok).toBe(true);
    expect(r.state.files["app.js"]).toBe("v3");
    expect(r.state.index["app.js"]).toBe("v3");
    expect(r.state.branches.main).toBe(s.branches.main);
  });

  it("hard gagal bila file tak terlacak akan tertimpa", () => {
    let s = commitFile(history(), "extra.txt", "dari commit", "empat");
    const index = { ...s.index };
    delete index["extra.txt"];
    s = { ...s, index, files: { ...s.files, "extra.txt": "punyaku" } };
    const r = exec(s, "git reset --hard");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
  });

  it("HEAD detached: reset menggeser head.id", () => {
    const s0 = history();
    const second = s0.commits[s0.branches.main].parents[0];
    const s = run(s0, `git switch ${second}`);
    const first = s.commits[second].parents[0];
    const r = exec(s, "git reset --hard HEAD~1");
    expect(r.ok).toBe(true);
    expect(r.state.head).toEqual({ type: "detached", id: first });
    expect(r.state.branches.main).toBe(s0.branches.main);
  });

  it("ditolak saat merge sedang berjalan", () => {
    let s = commitFile(initRepo(), "README.md", "awal", "awal");
    s = run(s, "git switch -c fitur");
    s = commitFile(s, "README.md", "versi fitur", "di fitur");
    s = run(s, "git switch main");
    s = commitFile(s, "README.md", "versi main", "di main");
    s = exec(s, "git merge fitur").state;
    expect(s.mergeState).not.toBeNull();
    const r = exec(s, "git reset --hard HEAD~1");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["merge.inProgress"]);
    expect(r.state).toBe(s);
  });

  it("revisi yang tak ada gagal", () => {
    const s = history();
    const r = exec(s, "git reset HEAD~99");
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
  });

  it("repo tanpa commit gagal dengan reset.noCommits", () => {
    const r = exec(initRepo(), "git reset");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["reset.noCommits"]);
  });

  it("flag tak dikenal gagal dengan reset.badFlag", () => {
    const r = exec(history(), "git reset --bogus");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["reset.badFlag"]);
    expect(paramsOf(r, "reset.badFlag")).toEqual({ flag: "--bogus" });
  });
});
