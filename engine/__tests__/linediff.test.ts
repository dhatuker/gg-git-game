import { describe, expect, it } from "vitest";
import { diffLines } from "../linediff";
import { raw } from "../messages";
import { rawLines } from "../state";

describe("diffLines", () => {
  it("baris yang sama menjadi konteks", () => {
    expect(diffLines("a\nb", "a\nb")).toEqual([
      { op: " ", text: "a" },
      { op: " ", text: "b" },
    ]);
  });

  it("dari kosong: semua baris ditambah", () => {
    expect(diffLines("", "x\ny")).toEqual([
      { op: "+", text: "x" },
      { op: "+", text: "y" },
    ]);
  });

  it("ke kosong: semua baris dihapus", () => {
    expect(diffLines("x", "")).toEqual([{ op: "-", text: "x" }]);
  });

  it("kosong ke kosong: tidak ada baris", () => {
    expect(diffLines("", "")).toEqual([]);
  });

  it("baris berubah di tengah: hapus sebelum tambah", () => {
    expect(diffLines("a\nb\nc", "a\nB\nc")).toEqual([
      { op: " ", text: "a" },
      { op: "-", text: "b" },
      { op: "+", text: "B" },
      { op: " ", text: "c" },
    ]);
  });

  it("baris disisipkan", () => {
    expect(diffLines("a\nc", "a\nb\nc").map((l) => l.op)).toEqual([" ", "+", " "]);
  });
});

describe("raw", () => {
  it("tanpa gaya tidak menambah properti style", () => {
    expect(raw("x")).toEqual({ raw: "x" });
    expect("style" in raw("x")).toBe(false);
  });

  it("dengan gaya", () => {
    expect(raw("x", "add")).toEqual({ raw: "x", style: "add" });
  });

  it("rawLines tidak memberi gaya pada baris (indeks map bukan gaya)", () => {
    expect(rawLines("a\nb")).toEqual([{ raw: "a" }, { raw: "b" }]);
  });
});
