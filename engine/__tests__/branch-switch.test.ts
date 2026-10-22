import { describe, expect, it } from "vitest";
import { isReachable } from "../state";
import { exec, initRepo, keys, rawText, run, write } from "./helpers";

const oneCommit = () => run(run(write(initRepo(), "a.txt", "1"), "git add ."), 'git commit -m "satu"');

describe("git branch", () => {
  it("menolak membuat branch sebelum ada commit", () => {
    expect(exec(initRepo(), "git branch fitur").ok).toBe(false);
  });

  it("membuat branch di commit HEAD dengan event", () => {
    const repo = oneCommit();
    const r = exec(repo, "git branch fitur");
    expect(r.ok).toBe(true);
    expect(r.state.branches.fitur).toBe(repo.branches.main);
    expect(r.events).toEqual([{ type: "branch-dibuat", name: "fitur", at: repo.branches.main }]);
    expect(r.state.head).toEqual({ type: "branch", name: "main" });
  });

  it("menampilkan daftar dengan penanda branch aktif", () => {
    const repo = run(oneCommit(), "git branch fitur");
    const out = rawText(exec(repo, "git branch")).split("\n");
    expect(out).toContain("* main");
    expect(out).toContain("  fitur");
  });

  it.each(["git branch -x", 'git branch "Fitur Baru"', "git branch a:b"])("menolak nama tidak valid: %s", (cmd) => {
    expect(exec(oneCommit(), cmd).ok).toBe(false);
  });

  it("menolak nama kembar", () => {
    const r = exec(run(oneCommit(), "git branch fitur"), "git branch fitur");
    expect(r.ok).toBe(false);
    expect(rawText(r)).toContain("already exists");
    expect(keys(r)).toContain("branch.exists");
  });

  it("menghapus branch dengan event", () => {
    const r = exec(run(oneCommit(), "git branch fitur"), "git branch -d fitur");
    expect(r.ok).toBe(true);
    expect(r.state.branches.fitur).toBeUndefined();
    expect(r.events).toEqual([{ type: "branch-dihapus", name: "fitur" }]);
  });

  it("menolak menghapus branch yang tidak ada atau yang aktif", () => {
    expect(exec(oneCommit(), "git branch -d nope").ok).toBe(false);
    const r = exec(oneCommit(), "git branch -d main");
    expect(r.ok).toBe(false);
    expect(rawText(r)).toContain("checked out");
  });

  it("menolak menghapus branch yang belum di-merge", () => {
    let repo = run(oneCommit(), "git switch -c fitur");
    repo = run(run(write(repo, "b.txt", "2"), "git add ."), 'git commit -m "dua"');
    repo = run(repo, "git switch main");
    const r = exec(repo, "git branch -d fitur");
    expect(r.ok).toBe(false);
    expect(rawText(r)).toContain("not fully merged");
  });
});

describe("git switch / checkout", () => {
  it("switch -c membuat branch lalu memindahkan HEAD", () => {
    const repo = oneCommit();
    const r = exec(repo, "git switch -c fitur");
    expect(r.ok).toBe(true);
    expect(r.state.head).toEqual({ type: "branch", name: "fitur" });
    expect(r.events.map((e) => e.type)).toEqual(["branch-dibuat", "branch-pindah"]);
    expect(r.events[1]).toEqual({ type: "branch-pindah", from: "main", to: "fitur" });
  });

  it("switch -c membawa perubahan yang belum di-commit", () => {
    const repo = write(oneCommit(), "a.txt", "diubah");
    const r = exec(repo, "git switch -c fitur");
    expect(r.ok).toBe(true);
    expect(r.state.files["a.txt"]).toBe("diubah");
  });

  it("checkout -b sama dengan switch -c", () => {
    expect(exec(oneCommit(), "git checkout -b fitur").state.head).toEqual({ type: "branch", name: "fitur" });
  });

  it("mengganti isi file sesuai snapshot branch tujuan dan mempertahankan file tak terlacak", () => {
    let repo = run(oneCommit(), "git switch -c fitur");
    repo = run(run(write(repo, "a.txt", "versi fitur"), "git add ."), 'git commit -m "ubah"');
    repo = write(repo, "catatan.txt", "draf");
    const r = exec(repo, "git switch main");
    expect(r.ok).toBe(true);
    expect(r.state.files["a.txt"]).toBe("1");
    expect(r.state.index["a.txt"]).toBe("1");
    expect(r.state.files["catatan.txt"]).toBe("draf");
  });

  it("menghapus file yang hanya ada di branch asal", () => {
    let repo = run(oneCommit(), "git switch -c fitur");
    repo = run(run(write(repo, "b.txt", "2"), "git add ."), 'git commit -m "dua"');
    const r = exec(repo, "git switch main");
    expect(r.state.files["b.txt"]).toBeUndefined();
    expect(r.state.index["b.txt"]).toBeUndefined();
  });

  it("menolak pindah saat ada perubahan terlacak belum di-commit", () => {
    const repo = write(run(oneCommit(), "git branch fitur"), "a.txt", "diubah");
    const r = exec(repo, "git switch fitur");
    expect(r.ok).toBe(false);
    expect(rawText(r)).toContain("Please commit your changes");
    expect(keys(r)).toContain("state.dirty");
    const staged = run(repo, "git add .");
    expect(exec(staged, "git switch fitur").ok).toBe(false);
  });

  it("pindah ke branch aktif tidak memberi event", () => {
    const r = exec(oneCommit(), "git switch main");
    expect(r.ok).toBe(true);
    expect(rawText(r)).toContain("Already on 'main'");
    expect(r.events).toEqual([]);
  });

  it("menolak target yang tidak ada", () => {
    const r = exec(oneCommit(), "git switch nope");
    expect(r.ok).toBe(false);
    expect(rawText(r)).toContain("invalid reference");
  });

  it("checkout <commit-id> membuat detached HEAD", () => {
    const repo = oneCommit();
    const id = repo.branches.main;
    const r = exec(repo, `git checkout ${id}`);
    expect(r.ok).toBe(true);
    expect(r.state.head).toEqual({ type: "detached", id });
    expect(r.events).toEqual([{ type: "head-pindah", id }]);
  });
});

describe("isReachable", () => {
  it("mengikuti rantai parent", () => {
    const one = oneCommit();
    const two = run(run(write(one, "a.txt", "2"), "git add ."), 'git commit -m "dua"');
    expect(isReachable(two, two.branches.main, one.branches.main)).toBe(true);
    expect(isReachable(two, one.branches.main, two.branches.main)).toBe(false);
  });
});

describe("titik awal dan switch -", () => {
  const twoCommits = () => run(run(write(oneCommit(), "b.txt", "2"), "git add ."), 'git commit -m "dua"');

  it("switch -c <nama> <titik-awal> membuat branch di titik awal dan mengganti isi working directory", () => {
    const s = twoCommits();
    const first = s.commits[s.branches.main].parents[0];
    const r = exec(s, "git switch -c lama HEAD~1");
    expect(r.ok).toBe(true);
    expect(r.state.branches.lama).toBe(first);
    expect(r.state.head).toEqual({ type: "branch", name: "lama" });
    expect(r.state.files["b.txt"]).toBeUndefined();
  });

  it("checkout -b menerima titik awal berupa nama branch", () => {
    const s = run(run(twoCommits(), "git branch tanda HEAD~1"), "git checkout -b dari-tanda tanda");
    expect(s.branches["dari-tanda"]).toBe(s.branches.tanda);
  });

  it("menolak titik awal lain bila ada perubahan belum di-commit", () => {
    const s = write(twoCommits(), "a.txt", "ubah");
    const r = exec(run(s, "git add ."), "git switch -c lama HEAD~1");
    expect(r.ok).toBe(false);
    expect(keys(r)).toContain("state.dirty");
  });

  it("menolak titik awal yang tidak dikenal", () => {
    const r = exec(oneCommit(), "git switch -c baru tidak-ada");
    expect(r.ok).toBe(false);
    expect(keys(r)).toContain("revision.unknown");
  });

  it("git branch <nama> <titik-awal>", () => {
    const s = twoCommits();
    expect(run(s, "git branch lama HEAD~1").branches.lama).toBe(s.commits[s.branches.main].parents[0]);
  });

  it("switch - kembali ke branch sebelumnya, bolak-balik", () => {
    let s = run(oneCommit(), "git switch -c fitur");
    s = run(s, "git switch main");
    s = run(s, "git switch -");
    expect(s.head).toEqual({ type: "branch", name: "fitur" });
    s = run(s, "git switch -");
    expect(s.head).toEqual({ type: "branch", name: "main" });
  });

  it("switch - tanpa riwayat pindah memberi pesan jelas", () => {
    const r = exec(oneCommit(), "git switch -");
    expect(r.ok).toBe(false);
    expect(keys(r)).toEqual(["switch.noPrevious"]);
  });
});
