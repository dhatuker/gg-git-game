import { describe, expect, it } from "vitest";
import { parseInput } from "../parse";

describe("parseInput", () => {
  it("mengelompokkan teks dalam tanda kutip ganda", () => {
    expect(parseInput('git commit -m "pesan  dua"')).toEqual({
      name: "commit",
      args: ["-m", "pesan  dua"],
    });
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
