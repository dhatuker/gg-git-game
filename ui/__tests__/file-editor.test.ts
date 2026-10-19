import { describe, expect, it } from "vitest";
import { defaultFile } from "../file-select";

describe("defaultFile", () => {
  it("memilih file yang konflik lebih dulu", () => {
    expect(defaultFile(["CONTRIBUTING.md", "README.md", "app.js"], ["README.md"])).toBe("README.md");
  });

  it("tanpa konflik memilih file pertama", () => {
    expect(defaultFile(["CONTRIBUTING.md", "README.md"], [])).toBe("CONTRIBUTING.md");
  });

  it("tanpa file → null", () => {
    expect(defaultFile([], [])).toBeNull();
  });
});
