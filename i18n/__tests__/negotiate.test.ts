import { describe, expect, it } from "vitest";
import { parseAcceptLanguage, pickLang } from "../negotiate";

describe("parseAcceptLanguage", () => {
  it("mengurutkan menurut q dan membuang q=0", () => {
    expect(parseAcceptLanguage("en;q=0.5, id-ID, fr;q=0")).toEqual(["id-ID", "en"]);
  });
});

describe("pickLang", () => {
  it("cookie yang valid menang atas header", () => {
    expect(pickLang("en", "id-ID")).toBe("en");
    expect(pickLang("id", "en-US")).toBe("id");
  });

  it("cookie rusak diabaikan", () => {
    expect(pickLang("fr", "id-ID")).toBe("id");
    expect(pickLang("", "id-ID")).toBe("id");
  });

  it("menghormati bobot q: preferensi Inggris dengan Indonesia sebagai cadangan tetap en", () => {
    expect(pickLang(undefined, "en-US,en;q=0.9,id;q=0.8")).toBe("en");
    expect(pickLang(undefined, "id-ID,id;q=0.9,en;q=0.8")).toBe("id");
  });

  it("melewati bahasa yang tidak didukung", () => {
    expect(pickLang(undefined, "fr-FR,id;q=0.5")).toBe("id");
    expect(pickLang(undefined, "ID")).toBe("id");
    expect(pickLang(undefined, "en;q=0,id")).toBe("id");
  });

  it.each([[""], [null], [undefined], ["*"], ["de"]])("header %j tanpa bahasa yang cocok → en", (h) => {
    expect(pickLang(undefined, h)).toBe("en");
  });
});
