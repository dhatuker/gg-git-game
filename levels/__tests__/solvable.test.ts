import { describe, expect, it } from "vitest";
import { parseInput } from "../../engine/parse";
import { LEVELS } from "../index";
import { applySteps } from "../solve";

function commandNames(level: (typeof LEVELS)[number]): string[] {
  return level.solution.flatMap((s) => {
    if (s.kind !== "cmd") return [];
    const p = parseInput(s.input);
    return "error" in p ? [] : [p.name];
  });
}

describe("LEVELS", () => {
  it("berisi 10 level dengan id berurutan", () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  describe.each(LEVELS.map((l) => [l.id, l] as const))("level %i", (_id, level) => {
    it("belum selesai di state awal", () => {
      expect(level.isGoalReached(level.initialState)).toBe(false);
    });

    it("selesai setelah skrip solusi dijalankan", () => {
      expect(level.isGoalReached(applySteps(level.initialState, level.solution))).toBe(true);
    });

    it("solusi hanya memakai perintah yang diizinkan", () => {
      for (const name of commandNames(level)) expect(level.allowedCommands).toContain(name);
    });

    it("mustRun termasuk dalam solusi", () => {
      for (const name of level.mustRun ?? []) expect(commandNames(level)).toContain(name);
    });

    it("punya minimal 2 petunjuk", () => {
      expect(level.hints.length).toBeGreaterThanOrEqual(2);
    });

    it("level tombol/hybrid punya tombol, dan tombolnya diizinkan", () => {
      if (level.mode !== "terminal") expect(level.buttons.length).toBeGreaterThan(0);
      for (const b of level.buttons) {
        const p = parseInput(b.command);
        expect("error" in p).toBe(false);
        if (!("error" in p)) expect(level.allowedCommands).toContain(p.name);
      }
    });
  });
});

describe("applySteps", () => {
  it("melempar bila sebuah perintah gagal", () => {
    expect(() => applySteps(LEVELS[0].initialState, [{ kind: "cmd", input: "git status" }])).toThrow();
  });
});
