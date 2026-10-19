import { describe, expect, it } from "vitest";
import { loadCompleted, saveCompleted } from "../progress";

const stub = (value: string | null) => ({ getItem: () => value });
const throwing = {
  getItem: () => {
    throw new Error("diblokir");
  },
  setItem: () => {
    throw new Error("diblokir");
  },
};

describe("loadCompleted", () => {
  it("membaca array angka", () => {
    expect(loadCompleted(stub("[1,2]"))).toEqual([1, 2]);
  });
  it.each([null, "{rusak", '["a"]', '{"a":1}', "5"])("mengembalikan [] untuk %j", (v) => {
    expect(loadCompleted(stub(v))).toEqual([]);
  });
  it("mengembalikan [] bila storage melempar", () => {
    expect(loadCompleted(throwing)).toEqual([]);
  });
  it("mengembalikan [] bila tidak ada storage sama sekali", () => {
    expect(loadCompleted(undefined)).toEqual([]);
  });
});

describe("saveCompleted", () => {
  it("menyimpan dengan kunci yang benar", () => {
    const saved: Record<string, string> = {};
    saveCompleted([1, 3], { setItem: (k: string, v: string) => void (saved[k] = v) });
    expect(saved["gg-git-game:completed"]).toBe("[1,3]");
  });
  it("tidak melempar bila storage melempar", () => {
    expect(() => saveCompleted([1], throwing)).not.toThrow();
  });
});
