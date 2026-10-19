import { describe, expect, it } from "vitest";
import { formatLine, formatLines, translate } from "../format";

describe("translate", () => {
  it("mengisi parameter dalam bahasa Indonesia", () => {
    expect(translate("id", "branch.exists", { name: "x" })).toContain("`x`");
    expect(translate("id", "branch.exists", { name: "x" })).toContain("sudah ada");
  });

  it("mengisi parameter dalam bahasa Inggris", () => {
    const s = translate("en", "branch.exists", { name: "x" });
    expect(s).toContain("`x`");
    expect(s).toContain("already exists");
  });

  it("membiarkan parameter yang tidak diberikan apa adanya", () => {
    expect(translate("en", "branch.exists")).toContain("{name}");
  });

  it("tidak memproses ulang nilai parameter yang mengandung kurung kurawal", () => {
    const s = translate("en", "branch.exists", { name: "{name}" });
    expect(s.split("{name}")).toHaveLength(2);
  });
});

describe("formatLine", () => {
  it("baris raw identik di kedua bahasa", () => {
    const line = { raw: "fatal: not a git repository" };
    expect(formatLine("id", line)).toBe("fatal: not a git repository");
    expect(formatLine("en", line)).toBe("fatal: not a git repository");
  });

  it("menggabungkan banyak baris dengan baris baru", () => {
    expect(formatLines("en", [{ key: "init.done" }, { raw: "Initialized empty Git repository in .git/" }])).toBe(
      `${translate("en", "init.done")}\nInitialized empty Git repository in .git/`,
    );
  });
});

describe("kualitas teks EN", () => {
  it("pesan file tak terlacak gramatikal untuk banyak file", () => {
    for (const key of ["untracked.switch", "untracked.merge"] as const) {
      const s = translate("en", key, { files: "a.txt, b.txt" });
      expect(s).not.toMatch(/The file a\.txt, b\.txt is/);
      expect(s).toContain("a.txt, b.txt");
    }
  });

  it("status bersih tidak sekadar mengulang pesan asli git", () => {
    const friendly = translate("en", "status.clean").toLowerCase().replace(/[^a-z ]/g, "");
    expect(friendly).not.toContain("nothing to commit");
  });
});
