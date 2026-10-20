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
  it("berisi 17 level dengan id berurutan", () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
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

    it("tidak ada petunjuk yang membocorkan perintah solusi secara utuh (id dan en)", () => {
      for (const forbidden of solutionCommandForms(level)) {
        for (const hint of level.hints) {
          expect(hint.id.toLowerCase()).not.toContain(forbidden);
          expect(hint.en.toLowerCase()).not.toContain(forbidden);
        }
      }
    });

    it("semua teks punya versi id dan en yang tidak kosong", () => {
      for (const text of [level.title, level.story, level.goal, ...level.hints]) {
        expect(text.id.trim().length).toBeGreaterThan(0);
        expect(text.en.trim().length).toBeGreaterThan(0);
      }
    });

    it("memakai nama netral (tanpa fitur, catatan.txt, ide.txt)", () => {
      const blob = JSON.stringify([level.initialState, level.solution]);
      for (const old of ["fitur", "catatan.txt", "ide.txt"]) expect(blob).not.toContain(old);
    });
  });
});

describe("applySteps", () => {
  it("melempar bila sebuah perintah gagal", () => {
    expect(() => applySteps(LEVELS[0].initialState, [{ kind: "cmd", input: "git status" }])).toThrow();
  });
});

describe("petunjuk EN setara dengan ID", () => {
  it("petunjuk level 7 tidak menyebut nama perintah pindah branch", () => {
    for (const h of LEVELS[6].hints) expect(h.en).not.toMatch(/\b(switch|checkout)\b/i);
  });

  it("petunjuk ke-2 level 8 mengarahkan ke kata di tujuan level, bukan teka-teki bahasa", () => {
    expect(LEVELS[7].hints[1].en).toMatch(/goal/i);
    expect(LEVELS[7].hints[1].en).not.toMatch(/English verb/i);
  });
});
