import { describe, expect, it } from "vitest";
import { ensureMigrated, KEY_V1, KEY_V2, loadCompleted, migrateCompletedV1, saveCompleted } from "../progress";

/** Storage palsu berbasis Map yang mencatat jumlah penulisan. */
function memory(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init));
  return {
    data,
    writes: 0,
    getItem(k: string) {
      return data.has(k) ? (data.get(k) as string) : null;
    },
    setItem(k: string, v: string) {
      this.writes++;
      data.set(k, v);
    },
  };
}

const throwing = {
  getItem: () => {
    throw new Error("diblokir");
  },
  setItem: () => {
    throw new Error("diblokir");
  },
};

describe("loadCompleted", () => {
  it("membaca array angka dari kunci v2", () => {
    expect(loadCompleted(memory({ [KEY_V2]: "[1,2]" }))).toEqual([1, 2]);
  });
  it.each(["{rusak", '["a"]', '{"a":1}', "5"])("mengembalikan [] untuk v2 %j", (v) => {
    expect(loadCompleted(memory({ [KEY_V2]: v }))).toEqual([]);
  });
  it("mengembalikan [] bila tidak ada data", () => {
    expect(loadCompleted(memory())).toEqual([]);
  });
  it("mengembalikan [] bila storage melempar", () => {
    expect(loadCompleted(throwing)).toEqual([]);
  });
  it("mengembalikan [] bila tidak ada storage sama sekali", () => {
    expect(loadCompleted(undefined)).toEqual([]);
  });
});

describe("migrasi v1 → v2", () => {
  it("memetakan 1–5 tetap dan 6–21 menjadi 10–25, membuang yang tidak valid dan duplikat", () => {
    expect(migrateCompletedV1([1, 5, 6, 21, 22, 0, 6])).toEqual([1, 5, 10, 25]);
  });

  it("loadCompleted memindahkan progres lama ke kunci v2 tanpa mengubah v1", () => {
    const store = memory({ [KEY_V1]: "[1,2,3,4,5,6,7]" });
    expect(loadCompleted(store)).toEqual([1, 2, 3, 4, 5, 10, 11]);
    expect(store.data.get(KEY_V2)).toBe("[1,2,3,4,5,10,11]");
    expect(store.data.get(KEY_V1)).toBe("[1,2,3,4,5,6,7]");
  });

  it("idempoten: migrasi hanya menulis sekali", () => {
    const store = memory({ [KEY_V1]: "[1,6]" });
    expect(loadCompleted(store)).toEqual([1, 10]);
    expect(loadCompleted(store)).toEqual([1, 10]);
    expect(store.writes).toBe(1);
  });

  it("v2 yang sudah ada tidak ditimpa", () => {
    const store = memory({ [KEY_V1]: JSON.stringify(Array.from({ length: 21 }, (_, i) => i + 1)), [KEY_V2]: "[1,2]" });
    expect(loadCompleted(store)).toEqual([1, 2]);
    expect(store.writes).toBe(0);
  });

  it("v2 rusak tidak diisi ulang dari v1", () => {
    const store = memory({ [KEY_V1]: "[1,2,3]", [KEY_V2]: "{rusak" });
    expect(loadCompleted(store)).toEqual([]);
    expect(store.writes).toBe(0);
  });

  it("v1 rusak dan v2 kosong → []", () => {
    expect(loadCompleted(memory({ [KEY_V1]: "{rusak" }))).toEqual([]);
  });

  it("ensureMigrated tidak melempar bila storage melempar", () => {
    expect(() => ensureMigrated(throwing)).not.toThrow();
  });
});

describe("saveCompleted", () => {
  it("menyimpan ke kunci v2", () => {
    const store = memory();
    saveCompleted([1, 3], store);
    expect(store.data.get(KEY_V2)).toBe("[1,3]");
    expect(store.data.has(KEY_V1)).toBe(false);
  });
  it("tidak melempar bila storage melempar", () => {
    expect(() => saveCompleted([1], throwing)).not.toThrow();
  });
});
