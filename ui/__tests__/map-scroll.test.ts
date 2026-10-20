import { describe, expect, it, vi } from "vitest";
import { scrollCurrentStop } from "../map-scroll";

describe("scrollCurrentStop", () => {
  it("memanggil scrollIntoView pada stasiun saat ini dengan nearest", () => {
    const scrollIntoView = vi.fn();
    const root = { querySelector: vi.fn(() => ({ scrollIntoView })) };
    scrollCurrentStop(root);
    expect(root.querySelector).toHaveBeenCalledWith(".gg-stop-current");
    expect(scrollIntoView).toHaveBeenCalledWith({ inline: "nearest", block: "nearest" });
  });

  it("aman bila root, elemen, atau scrollIntoView tidak ada, atau melempar", () => {
    expect(() => scrollCurrentStop(null)).not.toThrow();
    expect(() => scrollCurrentStop({ querySelector: () => null })).not.toThrow();
    expect(() => scrollCurrentStop({ querySelector: () => ({}) })).not.toThrow();
    const boom = () => {
      throw new Error("x");
    };
    expect(() => scrollCurrentStop({ querySelector: () => ({ scrollIntoView: boom }) })).not.toThrow();
  });
});
