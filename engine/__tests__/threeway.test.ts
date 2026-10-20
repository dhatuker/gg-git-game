import { describe, expect, it } from "vitest";
import { threeWay } from "../threeway";

describe("threeWay", () => {
  it("menggabungkan perubahan di file berbeda tanpa konflik", () => {
    const r = threeWay({ a: "1", b: "1" }, { a: "2", b: "1" }, { a: "1", b: "3" }, "feature");
    expect(r.merged).toEqual({ a: "2", b: "3" });
    expect(r.conflicts).toEqual([]);
    expect(r.conflictFiles).toEqual({});
  });

  it("memakai sisi yang berubah bila hanya satu sisi mengubah", () => {
    expect(threeWay({ a: "1" }, { a: "1" }, { a: "2" }, "x").merged).toEqual({ a: "2" });
    expect(threeWay({ a: "1" }, { a: "2" }, { a: "1" }, "x").merged).toEqual({ a: "2" });
  });

  it("bukan konflik bila kedua sisi mengubah menjadi isi sama", () => {
    const r = threeWay({ a: "1" }, { a: "2" }, { a: "2" }, "x");
    expect(r.merged).toEqual({ a: "2" });
    expect(r.conflicts).toEqual([]);
  });

  it("konflik menghasilkan penanda lengkap dengan label", () => {
    const r = threeWay({ a: "1" }, { a: "ours" }, { a: "theirs" }, "feature");
    expect(r.conflicts).toEqual(["a"]);
    expect(r.conflictFiles.a).toBe("<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> feature");
    expect(r.merged.a).toBe("ours");
  });

  it("file dihapus di satu sisi dan tak berubah di sisi lain hilang dari merged", () => {
    expect(threeWay({ a: "1" }, {}, { a: "1" }, "x").merged).toEqual({});
    expect(threeWay({ a: "1" }, { a: "1" }, {}, "x").merged).toEqual({});
  });
});
