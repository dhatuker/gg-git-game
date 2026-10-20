import { describe, expect, it } from "vitest";
import { LEVELS } from "..";
import { SUMMARIES, COMMAND_NOTES } from "../summaries";
import { TIERS, tierOf } from "../tiers";

describe("jalur belajar", () => {
  it("setiap level masuk tepat satu jalur, berurutan tanpa celah", () => {
    for (const l of LEVELS) expect(TIERS.filter((t) => l.id >= t.from && l.id <= t.to), `level ${l.id}`).toHaveLength(1);
    TIERS.forEach((t, i) => {
      expect(t.from).toBeLessThanOrEqual(t.to);
      expect(t.from).toBe(i === 0 ? 1 : TIERS[i - 1].to + 1);
    });
    expect(TIERS.at(-1)?.to).toBe(LEVELS.length);
  });

  it("tierOf mengembalikan jalur yang benar", () => {
    expect(tierOf(1)?.id).toBe("beginner");
    expect(tierOf(10)?.id).toBe("intermediate");
    expect(tierOf(LEVELS.length)?.id).toBe("teamwork");
    expect(tierOf(999)).toBeUndefined();
  });

  it("tiap jalur punya warna lane 0-4 yang berbeda", () => {
    expect(new Set(TIERS.map((t) => t.lane)).size).toBe(TIERS.length);
    for (const t of TIERS) expect(t.lane).toBeLessThan(5);
  });
});

describe("rangkuman level", () => {
  it.each(LEVELS.map((l) => l.id))("level %i punya rangkuman di kedua bahasa", (id) => {
    expect(SUMMARIES[id].id.trim().length).toBeGreaterThan(10);
    expect(SUMMARIES[id].en.trim().length).toBeGreaterThan(10);
  });

  it("setiap perintah yang dibuka di level punya catatan", () => {
    const all = new Set(LEVELS.flatMap((l) => l.allowedCommands));
    for (const c of all) expect(COMMAND_NOTES[c], c).toBeDefined();
  });
});
