import { describe, expect, it } from "vitest";
import { LEVELS } from "../../levels";
import { initGame, isUnlocked, reduce, visibleHints, type GameState } from "../game-state";

const run = (s: GameState, input: string) => reduce(s, { type: "run", input });

describe("reduce", () => {
  it("menyelesaikan level 1 dengan git init", () => {
    const s = run(initGame([]), "git init");
    expect(s.levelComplete).toBe(true);
    expect(s.completed).toEqual([1]);
    expect(s.lines[0]).toEqual({ kind: "input", text: "git init" });
    expect(s.lines[1].kind).toBe("output");
    expect(s.events).toEqual([{ type: "repo-dibuat" }]);
    expect(s.caption.length).toBeGreaterThan(0);
  });

  it("tidak menduplikasi id level yang sudah selesai", () => {
    let s = run(initGame([]), "git init");
    s = reduce(s, { type: "reset-level" });
    s = run(s, "git init");
    expect(s.completed).toEqual([1]);
  });

  it("menolak perintah yang belum dibuka di level ini", () => {
    const s = run(initGame([]), "git status");
    expect(s.lines.at(-1)).toEqual({ kind: "error", text: "Perintah ini belum dipakai di level ini." });
    expect(s.failedAttempts).toBe(1);
    expect(s.repo).toBe(LEVELS[0].initialState);
  });

  it("menghitung perintah gagal sebagai percobaan keliru", () => {
    const s = run(run(initGame([]), "git init"), "git init");
    expect(s.failedAttempts).toBe(1);
    expect(s.lines.at(-1)?.kind).toBe("error");
  });

  it("input yang tidak bisa diparse tetap menjadi baris error", () => {
    const s = run(initGame([]), "halo");
    expect(s.lines.at(-1)?.kind).toBe("error");
    expect(s.failedAttempts).toBe(1);
  });

  it("level 2 butuh git status walau file sudah dibuat", () => {
    let s = initGame([1]);
    expect(s.levelIndex).toBe(1);
    s = reduce(s, { type: "write", file: "catatan.txt", content: "x" });
    expect(s.levelComplete).toBe(false);
    s = run(s, "git status");
    expect(s.levelComplete).toBe(true);
    expect(s.completed).toEqual([1, 2]);
  });

  it("perintah baca-saja tetap memberi kalimat penjelasan", () => {
    let s = run(initGame([1]), "git status");
    expect(s.caption).toBe("Perintah ini hanya menampilkan informasi. Repositori tidak berubah.");
    s = run(s, "git init");
    expect(s.caption).toBe("Perintah ini hanya menampilkan informasi. Repositori tidak berubah.");
  });

  it("aksi write yang gagal menambah baris error", () => {
    const s = reduce(initGame([1]), { type: "write", file: "a b", content: "x" });
    expect(s.lines.at(-1)?.kind).toBe("error");
  });

  it("menyelesaikan level 10 lewat resolve", () => {
    let s = reduce(initGame([]), { type: "load-progress", completed: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
    expect(s.levelIndex).toBe(9);
    s = run(s, "git merge fitur");
    s = reduce(s, { type: "resolve", file: "README.md", choice: "theirs" });
    s = run(s, "git add README.md");
    s = run(s, 'git commit -m "beres"');
    expect(s.levelComplete).toBe(true);
  });

  it("menampilkan petunjuk setiap 2 kegagalan", () => {
    let s = initGame([]);
    expect(visibleHints(s)).toEqual([]);
    s = run(s, "git status");
    expect(visibleHints(s)).toEqual([]);
    s = run(s, "git status");
    expect(visibleHints(s)).toEqual([LEVELS[0].hints[0]]);
    for (let i = 0; i < 10; i++) s = run(s, "git status");
    expect(visibleHints(s)).toEqual(LEVELS[0].hints);
  });

  it("reset-level mengembalikan state awal tetapi mempertahankan progres", () => {
    let s = run(run(initGame([]), "git status"), "git init");
    s = reduce(s, { type: "reset-level" });
    expect(s.repo).toBe(LEVELS[0].initialState);
    expect(s.lines).toEqual([]);
    expect(s.ran).toEqual([]);
    expect(s.failedAttempts).toBe(0);
    expect(s.levelComplete).toBe(false);
    expect(s.completed).toEqual([1]);
  });

  it("goto-level ditolak bila terkunci dan diterima bila terbuka", () => {
    const locked = initGame([]);
    expect(reduce(locked, { type: "goto-level", index: 2 })).toBe(locked);
    const s = reduce(initGame([1, 2]), { type: "goto-level", index: 2 });
    expect(s.levelIndex).toBe(2);
    expect(s.repo).toBe(LEVELS[2].initialState);
    expect(reduce(s, { type: "goto-level", index: 0 }).levelIndex).toBe(0);
  });

  it("load-progress memulai di level pertama yang belum selesai", () => {
    expect(reduce(initGame([]), { type: "load-progress", completed: [1, 2] }).levelIndex).toBe(2);
  });
});

describe("initGame", () => {
  it("mulai di level terakhir bila semua selesai", () => {
    expect(initGame([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).levelIndex).toBe(9);
  });
});

describe("isUnlocked", () => {
  it("mengikuti id level sebelumnya", () => {
    expect(isUnlocked([], 0)).toBe(true);
    expect(isUnlocked([], 1)).toBe(false);
    expect(isUnlocked([1], 1)).toBe(true);
    expect(isUnlocked([1], 2)).toBe(false);
  });
});

describe("perbaikan review", () => {
  const atLevel = (index: number) => initGame(LEVELS.slice(0, index).map((l) => l.id));

  it("typo perintah mendapat saran, bukan pesan 'belum dipakai'", () => {
    const s = run(atLevel(4), "git stauts");
    const last = s.lines.at(-1)!;
    expect(last.kind).toBe("error");
    expect(last.text).toContain("Mungkin maksudmu `git status`");
    expect(last.text).not.toContain("belum dipakai di level ini");
  });

  it("perintah git asli yang belum dibuka tetap mendapat pesan 'belum dipakai'", () => {
    const s = run(atLevel(4), "git merge fitur");
    expect(s.lines.at(-1)!.text).toBe("Perintah ini belum dipakai di level ini.");
  });

  it("status level selesai tetap bertahan walau pemain bereksperimen sesudahnya", () => {
    let s = run(atLevel(6), "git switch fitur");
    expect(s.levelComplete).toBe(true);
    s = run(s, "git switch main");
    expect(s.levelComplete).toBe(true);
  });

  it("ulangi level mengembalikan status selesai ke false", () => {
    let s = run(atLevel(6), "git switch fitur");
    s = reduce(s, { type: "reset-level" });
    expect(s.levelComplete).toBe(false);
  });
});
