import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "../proxy";

const req = (headers: Record<string, string> = {}) => new NextRequest("http://localhost:3100/", { headers });

describe("proxy", () => {
  it("cookie gg-lang menentukan tujuan", () => {
    const r = proxy(req({ cookie: "gg-lang=id", "accept-language": "en-US" }));
    expect(r.status).toBe(307);
    expect(new URL(r.headers.get("location")!).pathname).toBe("/id");
  });

  it("tanpa cookie memakai Accept-Language", () => {
    expect(new URL(proxy(req({ "accept-language": "en-US,en;q=0.9" })).headers.get("location")!).pathname).toBe("/en");
    expect(new URL(proxy(req({ "accept-language": "id-ID" })).headers.get("location")!).pathname).toBe("/id");
  });

  it("tanpa petunjuk apa pun → /en", () => {
    expect(new URL(proxy(req()).headers.get("location")!).pathname).toBe("/en");
  });

  it("hanya berjalan di /", () => {
    expect(config.matcher).toEqual(["/"]);
  });
});
