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

/** Bentuk perintah solusi yang tidak boleh muncul di petunjuk: `git <nama> <argumen>`, dan `<nama> <argumen>` bila ada argumen. */
function solutionCommandForms(level: (typeof LEVELS)[number]): string[] {
  return level.solution.flatMap((s) => {
    if (s.kind !== "cmd") return [];
    const p = parseInput(s.input);
    if ("error" in p) return [];
    const rest = [p.name, ...p.args].join(" ").toLowerCase();
    return p.args.length > 0 ? [`git ${rest}`, rest] : [`git ${rest}`];
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

    it("punya tepat 3 petunjuk bertingkat", () => {
      expect(level.hints).toHaveLength(3);
    });

    it("tidak ada petunjuk yang membocorkan perintah solusi secara utuh", () => {
      for (const forbidden of solutionCommandForms(level)) {
        for (const hint of level.hints) expect(hint.toLowerCase()).not.toContain(forbidden);
      }
    });
  });
});

describe("applySteps", () => {
  it("melempar bila sebuah perintah gagal", () => {
    expect(() => applySteps(LEVELS[0].initialState, [{ kind: "cmd", input: "git status" }])).toThrow();
  });
});
