import { describe, expect, it } from "vitest";
import { CARRY_KEY, saveCarry, takeCarry } from "../carry";
import { initGame, reduce, type GameState } from "../game-state";

function memory() {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  };
}
const throwing = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

function midGame(): GameState {
  let s = initGame([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  s = reduce(s, { type: "run", input: "git merge feature" });
  s = reduce(s, { type: "reveal-hint" });
  return s;
}

describe("carry", () => {
  it("bolak-balik mempertahankan state (tanpa event animasi)", () => {
    const store = memory();
    const s = midGame();
    saveCarry(s, "id", store, 1000);
    expect(takeCarry("id", store, 1000)).toEqual({ ...s, events: [] });
  });

  it("sekali pakai: pembacaan kedua null", () => {
    const store = memory();
    saveCarry(midGame(), "id", store, 1000);
    takeCarry("id", store, 1000);
    expect(takeCarry("id", store, 1000)).toBeNull();
  });

  it.each([
    ["JSON rusak", "{rusak"],
    ["levelIndex di luar jangkauan", JSON.stringify({ v: 1, lang: "id", at: 1000, state: { ...midGame(), levelIndex: 99 } })],
    ["repo hilang", JSON.stringify({ v: 1, lang: "id", at: 1000, state: { ...midGame(), repo: undefined } })],
    ["bentuk lama tanpa stempel", JSON.stringify(midGame())],
  ])("%s → null dan kunci terhapus", (_n, raw) => {
    const store = memory();
    store.setItem(CARRY_KEY, raw);
    expect(takeCarry("id", store, 1000)).toBeNull();
    expect(CARRY_KEY in store.data).toBe(false);
  });

  it("storage yang melempar tidak melempar", () => {
    expect(() => saveCarry(midGame(), "id", throwing)).not.toThrow();
    expect(takeCarry("id", throwing)).toBeNull();
  });
});

describe("stempel bahasa dan waktu", () => {
  it("carry untuk bahasa lain diabaikan dan terhapus", () => {
    const store = memory();
    saveCarry(midGame(), "en", store, 1000);
    expect(takeCarry("id", store, 1000)).toBeNull();
    expect(CARRY_KEY in store.data).toBe(false);
  });

  it("carry yang lebih tua dari 30 detik diabaikan (mis. pindah bahasa yang dibatalkan)", () => {
    const store = memory();
    saveCarry(midGame(), "id", store, 1000);
    expect(takeCarry("id", store, 1000 + 30_001)).toBeNull();
  });

  it("carry dalam 30 detik diterima", () => {
    const store = memory();
    saveCarry(midGame(), "id", store, 1000);
    expect(takeCarry("id", store, 1000 + 30_000)).not.toBeNull();
  });
});

describe("reduce restore", () => {
  it("menggabungkan level selesai dengan progres tersimpan yang lebih baru", () => {
    const carried = { ...midGame(), completed: [1] };
    const s = reduce(initGame([]), { type: "restore", state: carried, savedCompleted: [1, 2, 3, 4, 5] });
    expect(s.completed).toEqual([1, 2, 3, 4, 5]);
    expect(s.repo).toBe(carried.repo);
  });

  it("mengganti seluruh state", () => {
    const target = midGame();
    expect(reduce(initGame([]), { type: "restore", state: target, savedCompleted: [] })).toEqual(target);
  });
});
