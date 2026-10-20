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

describe("carry state lama", () => {
  it("state tersimpan tanpa stash dan rebaseState dinormalisasi", () => {
    const store = memory();
    const s = midGame();
    const oldRepo: Record<string, unknown> = { ...s.repo };
    delete oldRepo.stash;
    delete oldRepo.rebaseState;
    store.setItem(CARRY_KEY, JSON.stringify({ v: 1, lang: "id", at: 1000, state: { ...s, repo: oldRepo } }));
    const got = takeCarry("id", store, 1000);
    expect(got?.repo.stash).toEqual([]);
    expect(got?.repo.rebaseState).toBeNull();
  });
});

describe("carry dengan stash/rebaseState rusak", () => {
  it("stash bukan array → [], rebaseState bukan objek → null", () => {
    for (const [stash, rebaseState] of [
      ["rusak", "x"],
      [{ 0: 1 }, [1, 2]],
      [42, 7],
    ] as const) {
      const store = memory();
      const s = midGame();
      store.setItem(CARRY_KEY, JSON.stringify({ v: 1, lang: "id", at: 1000, state: { ...s, repo: { ...s.repo, stash, rebaseState } } }));
      const got = takeCarry("id", store, 1000);
      expect(got?.repo.stash).toEqual([]);
      expect(got?.repo.rebaseState).toBeNull();
    }
  });

  it("rebaseState objek yang sah dipertahankan", () => {
    const store = memory();
    const s = midGame();
    const rs = { branch: "feature", onto: "a", originalTip: "b", current: null, remaining: [], conflicts: [] };
    store.setItem(CARRY_KEY, JSON.stringify({ v: 1, lang: "id", at: 1000, state: { ...s, repo: { ...s.repo, rebaseState: rs } } }));
    expect(takeCarry("id", store, 1000)?.repo.rebaseState).toEqual(rs);
  });
});

describe("carry remote", () => {
  const put = (store: ReturnType<typeof memory>, repo: Record<string, unknown>) => {
    const s = midGame();
    store.setItem(CARRY_KEY, JSON.stringify({ v: 1, lang: "id", at: 1000, state: { ...s, repo } }));
    return s;
  };

  it("simpanan tanpa remote/remoteRefs -> null / {}", () => {
    const store = memory();
    const repo: Record<string, unknown> = { ...midGame().repo };
    delete repo.remote;
    delete repo.remoteRefs;
    put(store, repo);
    const got = takeCarry("id", store, 1000);
    expect(got?.repo.remote).toBeNull();
    expect(got?.repo.remoteRefs).toEqual({});
  });

  it("remote string / remoteRefs array dinormalkan", () => {
    const store = memory();
    put(store, { ...midGame().repo, remote: "x", remoteRefs: [1] });
    const got = takeCarry("id", store, 1000);
    expect(got?.repo.remote).toBeNull();
    expect(got?.repo.remoteRefs).toEqual({});
  });

  it("objek sah dipertahankan", () => {
    const store = memory();
    const remote = { url: "u", connected: true, branches: {}, commits: {} };
    put(store, { ...midGame().repo, remote, remoteRefs: { main: "abc" } });
    const got = takeCarry("id", store, 1000);
    expect(got?.repo.remote).toEqual(remote);
    expect(got?.repo.remoteRefs).toEqual({ main: "abc" });
  });
});
