import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");

describe("struktur app/", () => {
  it.each(["app/layout.tsx", "app/page.tsx", "app/layout.js", "app/page.js"])(
    "%s tidak boleh ada: root layout ada di app/[lang]/layout.tsx (hapus file lama ini)",
    (file) => {
      expect(existsSync(join(root, file)), `Hapus ${file}. File ini sisa sebelum routing /id dan /en dan menyebabkan <html> bersarang serta hydration error.`).toBe(false);
    },
  );

  it("root layout per bahasa ada", () => {
    expect(existsSync(join(root, "app/[lang]/layout.tsx"))).toBe(true);
  });
});
