import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EMPTY_SANDBOX, MAX_UNDO, parseSaved, reduceSandbox, saveable, type SandboxAction, type SandboxState } from "../sandbox-state";

const log = readFileSync(join(__dirname, "../../sandbox/__tests__/fixtures/small.txt"), "utf8");
const play = (actions: SandboxAction[], from: SandboxState = EMPTY_SANDBOX) => actions.reduce(reduceSandbox, from);

describe("sandbox", () => {
  it("memuat log dan menyimpan riwayat awal", () => {
    const s = play([{ type: "load", source: { kind: "log", text: log } }]);
    expect(s.initial).toBe(s.repo);
    expect(s.stats?.commits).toBe(9);
    expect(s.error).toBeNull();
  });

  it("log tidak valid memberi error dan tetap di layar impor", () => {
    const s = play([{ type: "load", source: { kind: "log", text: "bukan log" } }]);
    expect(s.initial).toBeNull();
    expect(s.error).toBe("noCommits");
  });

  it("contoh bawaan memuat proyek dengan remote simulasi", () => {
    const s = play([{ type: "load", source: { kind: "sample" } }]);
    expect(s.repo.remote?.connected).toBe(true);
    expect(Object.keys(s.repo.commits).length).toBeGreaterThan(10);
  });

  it("semua perintah boleh dipakai, termasuk yang terkunci di level awal", () => {
    const s = play([{ type: "load", source: { kind: "sample" } }, { type: "run", input: "git rebase --abort" }]);
    expect(JSON.stringify(s.lines)).not.toContain("game.notAllowed");
  });

  it("undo mengembalikan repo sebelum perintah terakhir", () => {
    const loaded = play([{ type: "load", source: { kind: "log", text: log } }]);
    const s = play([{ type: "run", input: "git reset --hard HEAD~2" }, { type: "undo" }], loaded);
    expect(s.repo).toBe(loaded.repo);
    expect(s.past).toEqual([]);
  });

  it("perintah baca saja (status, log) tidak menambah undo", () => {
    const s = play([{ type: "load", source: { kind: "sample" } }, { type: "run", input: "git status" }, { type: "run", input: "git log --oneline" }]);
    expect(s.past).toEqual([]);
  });

  it(`undo dibatasi ${MAX_UNDO} langkah`, () => {
    const loaded = play([{ type: "load", source: { kind: "sample" } }]);
    const switches: SandboxAction[] = Array.from({ length: MAX_UNDO + 5 }, (_, i) => ({ type: "run", input: i % 2 ? "git switch main" : "git switch -c b" + i }));
    expect(play(switches, loaded).past).toHaveLength(MAX_UNDO);
  });

  it("reset kembali ke riwayat impor dan mengosongkan terminal", () => {
    const loaded = play([{ type: "load", source: { kind: "log", text: log } }]);
    const s = play([{ type: "run", input: "git branch -D docs" }, { type: "reset" }], loaded);
    expect(s.repo).toBe(loaded.initial);
    expect(s.lines).toEqual([]);
  });

  it("sesi tersimpan diputar ulang ke state yang sama", () => {
    const s = play([
      { type: "load", source: { kind: "log", text: log } },
      { type: "run", input: "git switch docs" },
      { type: "run", input: "git merge feature/login" },
      { type: "resolve", file: "a.txt", choice: "ours" },
      { type: "run", input: 'git commit -m "gabung"' },
      { type: "undo" },
    ]);
    const saved = parseSaved(JSON.stringify(saveable(s)));
    expect(saved).not.toBeNull();
    const restored = reduceSandbox(EMPTY_SANDBOX, { type: "restore", saved: saved! });
    expect(restored.repo).toEqual(s.repo);
    expect(restored.lines).toEqual(s.lines);
    expect(restored.past).toEqual(s.past);
  });

  it("data tersimpan yang rusak diabaikan", () => {
    expect(parseSaved("{")).toBeNull();
    expect(parseSaved(JSON.stringify({ source: { kind: "lain" }, steps: [] }))).toBeNull();
    expect(parseSaved(JSON.stringify({ source: { kind: "sample" }, steps: [{ type: "hapus" }] }))).toBeNull();
  });
});

describe("decodeLogFile", () => {
  it("membaca file UTF-16 dari PowerShell dan UTF-8 biasa", async () => {
    const { decodeLogFile } = await import("../SandboxPage");
    const text = "@@@abc|||x";
    const utf16 = new Uint8Array([0xff, 0xfe, ...[...text].flatMap((c) => [c.charCodeAt(0), 0])]);
    expect(decodeLogFile(utf16)).toBe(text);
    expect(decodeLogFile(new TextEncoder().encode(text))).toBe(text);
  });
});

describe("file log terlalu besar", () => {
  it("menampilkan galat tooLarge di layar impor", () => {
    const s = reduceSandbox(EMPTY_SANDBOX, { type: "too-large" });
    expect(s.error).toBe("tooLarge");
    expect(s.initial).toBeNull();
  });
});
