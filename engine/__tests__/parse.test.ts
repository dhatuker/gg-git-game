import { describe, expect, it } from "vitest";
import { parseInput } from "../parse";

describe("parseInput", () => {
  it("mengelompokkan teks dalam tanda kutip ganda", () => {
    expect(parseInput('git commit -m "pesan  dua"')).toEqual({
      name: "commit",
      args: ["-m", "pesan  dua"],
    });
  });

  it("mengelompokkan teks dalam tanda kutip tunggal", () => {
    expect(parseInput("git commit -m 'Add search box'")).toEqual({ name: "commit", args: ["-m", "Add search box"] });
  });

  it("kutip jenis lain di dalam kutip dibaca apa adanya", () => {
    expect(parseInput(`git commit -m "it's done"`)).toEqual({ name: "commit", args: ["-m", "it's done"] });
    expect(parseInput(`git commit -m 'say "hi"'`)).toEqual({ name: "commit", args: ["-m", 'say "hi"'] });
  });

  it("menerima kutip pintar dari keyboard HP", () => {
    expect(parseInput("git commit -m “Add search box”")).toEqual({ name: "commit", args: ["-m", "Add search box"] });
    expect(parseInput("git commit -m ‘Fix typo’")).toEqual({ name: "commit", args: ["-m", "Fix typo"] });
  });

  it("kutip kosong tetap menjadi satu argumen kosong", () => {
    expect(parseInput("git commit -m ''")).toEqual({ name: "commit", args: ["-m", ""] });
  });

  it("kutip tunggal yang belum ditutup ditolak", () => {
    const r = parseInput("git commit -m 'x");
    expect("error" in r && r.error.key).toBe("parse.unclosedQuote");
  });

  it("mengabaikan spasi berlebih", () => {
    expect(parseInput("git   status")).toEqual({ name: "status", args: [] });
  });

  it.each(["", "   ", "git", "git commit -m \"x"])("menolak input %j", (input) => {
    const r = parseInput(input);
    expect("error" in r && r.error.key.startsWith("parse.")).toBe(true);
  });

  it("membedakan kutip yang belum ditutup", () => {
    const r = parseInput('git commit -m "x');
    expect("error" in r && r.error.key).toBe("parse.unclosedQuote");
  });

  it("menolak input yang tidak diawali git dengan pesan yang menyebut git", () => {
    const r = parseInput("commit");
    expect("error" in r).toBe(true);
    if ("error" in r) expect(r.error.key).toBe("parse.notGit");
  });
});
