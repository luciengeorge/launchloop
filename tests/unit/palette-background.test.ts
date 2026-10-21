import { describe, expect, it } from "vitest";
import { contrast, extractPalette, hexToRgb } from "@/lib/ingest/colors";

describe("palette background", () => {
  it("uses a neutral theme-color as the page background when the CSS declares none", () => {
    const palette = extractPalette({ css: ".btn{background:#f7a501} a{color:#f7a501} .x{color:#f7a501}", themeColor: "#E5E7E0" });
    expect(palette.background).toBe("#e5e7e0");
    expect(palette.foreground).toBe("#0a0a10");
    expect(contrast(hexToRgb(palette.accent), hexToRgb(palette.background))).toBeGreaterThanOrEqual(3);
  });

  it("keeps a declared light background and darkens a light accent instead of going dark", () => {
    const palette = extractPalette({ css: ":root{--background:#ffffff;--primary:#facc15}" });
    expect(palette.background).toBe("#ffffff");
    expect(contrast(hexToRgb(palette.accent), hexToRgb(palette.background))).toBeGreaterThanOrEqual(3);
  });

  it("still makes up a dark, accent-tinted background when the page gives no hint", () => {
    const palette = extractPalette({ css: ".a{color:#2563eb} .b{color:#2563eb}", themeColor: "#2563eb" });
    expect(palette.foreground).toBe("#ffffff");
    expect(contrast(hexToRgb(palette.background), hexToRgb("#000000"))).toBeLessThan(2);
  });
});
