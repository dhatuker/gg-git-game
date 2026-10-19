import { describe, expect, it } from "vitest";
import { exec, initRepo, keys, rawText, run, write } from "./helpers";

const staged = () => run(write(initRepo(), "a.txt", "1"), "git add a.txt");

describe("git commit", () => {
  it("membuat commit pertama tanpa parent dan memajukan main", () => {
    const r = exec(staged(), 'git commit -m "Commit pertama"');
    expect(r.ok).toBe(true);
    const id = r.state.branches.main;
    expect(id).toHaveLength(7);
    expect(r.state.commits[id].parents).toEqual([]);
    expect(r.state.commits[id].snapshot).toEqual({ "a.txt": "1" });
    expect(rawText(r)).toBe(`[main ${id}] Commit pertama`);
    expect(r.events).toEqual([{ type: "commit-dibuat", id, parents: [] }]);
  });

  it("menolak commit tanpa -m atau dengan pesan kosong", () => {
    expect(exec(staged(), "git commit").ok).toBe(false);
    expect(exec(staged(), 'git commit -m ""').ok).toBe(false);
    expect(exec(staged(), "git commit -m").ok).toBe(false);
  });

  it("menolak commit tanpa perubahan di staging", () => {
    const r1 = exec(initRepo(), 'git commit -m "x"');
    expect(r1.ok).toBe(false);
    expect(rawText(r1)).toContain("nothing to commit");
    expect(keys(r1)).toContain("commit.nothingStaged");
    const once = run(staged(), 'git commit -m "satu"');
    const r2 = exec(once, 'git commit -m "dua"');
    expect(r2.ok).toBe(false);
    expect(rawText(r2)).toContain("nothing to commit");
  });

  it("commit kedua punya parent commit pertama", () => {
    const one = run(staged(), 'git commit -m "satu"');
    const first = one.branches.main;
    const two = run(run(write(one, "a.txt", "2"), "git add ."), 'git commit -m "dua"');
    const second = two.branches.main;
    expect(second).not.toBe(first);
    expect(two.commits[second].parents).toEqual([first]);
    expect(two.commits[second].seq).toBe(1);
  });

  it("menolak commit saat masih ada konflik", () => {
    const repo = { ...staged(), mergeState: { from: "fitur", fromCommit: "abc1234", conflicts: ["a.txt"] } };
    expect(exec(repo, 'git commit -m "x"').ok).toBe(false);
  });
});

describe("git log", () => {
  it("--oneline menampilkan commit terbaru lebih dulu", () => {
    const one = run(staged(), 'git commit -m "satu"');
    const two = run(run(write(one, "a.txt", "2"), "git add ."), 'git commit -m "dua"');
    const out = rawText(exec(two, "git log --oneline")).split("\n");
    expect(out[0]).toBe(`${two.branches.main} dua`);
    expect(out[1]).toBe(`${one.branches.main} satu`);
  });

  it("format default memuat 'commit <id>' dan pesan menjorok", () => {
    const one = run(staged(), 'git commit -m "satu"');
    const out = rawText(exec(one, "git log"));
    expect(out).toContain(`commit ${one.branches.main}`);
    expect(out).toContain("    satu");
  });

  it("gagal bila belum ada commit", () => {
    const r = exec(initRepo(), "git log");
    expect(r.ok).toBe(false);
    expect(rawText(r)).toContain("does not have any commits yet");
    expect(keys(r)).toEqual(["log.noCommits"]);
  });
});

describe("baris raw", () => {
  it("git log --oneline hanya berisi baris raw", () => {
    const one = run(run(write(initRepo(), "a.txt", "1"), "git add ."), 'git commit -m "satu"');
    const r = exec(one, "git log --oneline");
    expect(keys(r)).toEqual([]);
    expect(rawText(r)).toBe(`${one.branches.main} satu`);
  });
});
