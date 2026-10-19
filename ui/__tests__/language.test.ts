import { describe, expect, it } from "vitest";
import { langCookie } from "../language";

describe("langCookie", () => {
  it("menulis cookie preferensi bahasa yang dibaca proxy", () => {
    expect(langCookie("en")).toBe("gg-lang=en; Path=/; Max-Age=31536000; SameSite=Lax");
    expect(langCookie("id")).toBe("gg-lang=id; Path=/; Max-Age=31536000; SameSite=Lax");
  });
});
