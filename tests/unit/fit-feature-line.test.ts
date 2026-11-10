import { describe, expect, it } from "vitest";
import * as imageFit from "@/lib/image-fit";
import { ELLIPSIS } from "@/lib/image-fit";

type FitFeatureLine = (text: string, boxWidth: number, baseSize: number, measure: (text: string, size: number) => number) => { size: number; lines: string[] };
const { fitFeatureLine } = imageFit as unknown as { fitFeatureLine?: FitFeatureLine };

/** Half an em per character: at the 20 px base a 400 px box holds 40 characters a line, at the 15 px minimum 53. */
const measure = (text: string, size: number) => [...text].length * size * 0.5;
const BOX = 400;
const BASE = 20;
const MIN = BASE * 0.75;
const words = (n: number) => "abcd ".repeat(n).trim();

function fit(text: string) {
  expect(fitFeatureLine, "image-fit exports fitFeatureLine").toBeTypeOf("function");
  const result = fitFeatureLine!(text, BOX, BASE, measure);
  for (const line of result.lines) {
    expect(line).not.toContain(ELLIPSIS);
    expect(measure(line, result.size), `"${line}" at ${result.size}px`).toBeLessThanOrEqual(BOX);
  }
  return result;
}

describe("fitFeatureLine", () => {
  it("keeps a short line on one line at the base size", () => {
    expect(fit("Barcode scan")).toEqual({ size: BASE, lines: ["Barcode scan"] });
  });

  it("wraps a long line onto two lines at the base size", () => {
    const text = words(14);
    const { size, lines } = fit(text);
    expect(size).toBe(BASE);
    expect(lines).toHaveLength(2);
    expect(lines.join(" ")).toBe(text);
  });

  it("shrinks a line that needs three lines at the base size until it fits on two, never below 75%", () => {
    const text = words(20);
    const { size, lines } = fit(text);
    expect(size).toBeLessThan(BASE);
    expect(size).toBeGreaterThanOrEqual(MIN);
    expect(lines).toHaveLength(2);
    expect(lines.join(" ")).toBe(text);
  });

  it("takes a third line at the 75% minimum when two lines can't hold it, with no ellipsis", () => {
    const text = words(30);
    const { size, lines } = fit(text);
    expect(size).toBe(MIN);
    expect(lines).toHaveLength(3);
    expect(lines.join(" ")).toBe(text);
  });

  it("splits a single word wider than the box, without an ellipsis", () => {
    const word = "a".repeat(120);
    const { size, lines } = fit(word);
    expect(size).toBe(MIN);
    expect(lines.join("")).toBe(word);
  });
});
