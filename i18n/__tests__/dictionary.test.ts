import { describe, expect, it } from "vitest";
import { DICTS } from "../index";

const params = (t: string) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("kamus", () => {
  it("id dan en punya kunci yang sama", () => {
    expect(Object.keys(DICTS.en).sort()).toEqual(Object.keys(DICTS.id).sort());
  });

  it.each(Object.keys(DICTS.id))("%s: parameter sama di kedua bahasa dan template tidak kosong", (key) => {
    const id = DICTS.id[key as keyof typeof DICTS.id];
    const en = DICTS.en[key as keyof typeof DICTS.en];
    expect(id.trim().length).toBeGreaterThan(0);
    expect(en.trim().length).toBeGreaterThan(0);
    expect(params(en)).toEqual(params(id));
  });
});

describe("state.dirty", () => {
  it.each(["id", "en"] as const)("%s: netral dan menyebut git stash sebagai pilihan", (lang) => {
    const text = DICTS[lang]["state.dirty"];
    expect(text).toContain("git stash");
    expect(text).not.toMatch(/switching or merging|pindah atau merge/);
  });
});
