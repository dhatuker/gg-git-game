import { describe, expect, it } from "vitest";
import { LEVELS } from "../../levels";
import { countInputs, learnedCommands, newCommands, succeededInputs } from "../level-info";
import type { TerminalLine } from "../game-state";

describe("newCommands", () => {
  it("level 1 membuka init, level 4 membuka commit", () => {
    expect(newCommands(0)).toEqual(["init"]);
    expect(newCommands(3)).toEqual(["commit"]);
  });
  it("level tanpa perintah baru mengembalikan []", () => {
    expect(newCommands(8)).toEqual([]);
  });
  it("indeks di luar rentang aman", () => {
    expect(newCommands(-1)).toEqual([]);
    expect(newCommands(999)).toEqual([]);
  });
});

describe("learnedCommands", () => {
  it("mengumpulkan perintah beserta level pertama kemunculannya, tanpa duplikat", () => {
    const l = learnedCommands(3);
    expect(l).toEqual([
      { name: "init", levelId: 1 },
      { name: "status", levelId: 2 },
      { name: "add", levelId: 3 },
      { name: "commit", levelId: 4 },
    ]);
    const all = learnedCommands(LEVELS.length - 1).map((c) => c.name);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("succeededInputs / countInputs", () => {
  const lines: TerminalLine[] = [
    { kind: "input", text: "git status" },
    { kind: "output", lines: [{ raw: "ok" }] },
    { kind: "input", text: "git comit" },
    { kind: "error", lines: [{ raw: "salah" }] },
    { kind: "input", text: "git status" },
    { kind: "output", lines: [{ raw: "ok" }] },
    { kind: "input", text: 'git commit -m "x"' },
    { kind: "output", lines: [{ raw: "ok" }] },
  ];
  it("hanya input yang berhasil, tanpa duplikat", () => {
    expect(succeededInputs(lines)).toEqual(["git status", 'git commit -m "x"']);
  });
  it("menghitung semua input", () => {
    expect(countInputs(lines)).toBe(4);
  });
});
