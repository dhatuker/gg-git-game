import { describe, expect, it } from "vitest";
import { exec, initRepo, run, write } from "./helpers";

const staged = () => run(write(initRepo(), "a.txt", "1"), "git add a.txt");

describe("git commit", () => {
  it("membuat commit pertama tanpa parent dan memajukan main", () => {
    const r = exec(staged(), 'git commit -m "Commit pertama"');
    expect(r.ok).toBe(true);
    const id = r.state.branches.main;
    expect(id).toHaveLength(7);
    expect(r.state.commits[id].parents).toEqual([]);
    expect(r.state.commits[id].snapshot).toEqual({ "a.txt": "1" });
    expect(r.output).toContain(id);
    expect(r.output).toContain("[main ");
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
    expect(r1.output).toContain("nothing to commit");
    const once = run(staged(), 'git commit -m "satu"');
    const r2 = exec(once, 'git commit -m "dua"');
    expect(r2.ok).toBe(false);
    expect(r2.output).toContain("nothing to commit");
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
    const out = exec(two, "git log --oneline").output.split("\n");
    expect(out[0]).toBe(`${two.branches.main} dua`);
    expect(out[1]).toBe(`${one.branches.main} satu`);
  });

  it("format default memuat 'commit <id>' dan pesan menjorok", () => {
    const one = run(staged(), 'git commit -m "satu"');
    const out = exec(one, "git log").output;
    expect(out).toContain(`commit ${one.branches.main}`);
    expect(out).toContain("    satu");
  });

  it("gagal bila belum ada commit", () => {
    const r = exec(initRepo(), "git log");
    expect(r.ok).toBe(false);
    expect(r.output).toContain("does not have any commits yet");
  });
});
