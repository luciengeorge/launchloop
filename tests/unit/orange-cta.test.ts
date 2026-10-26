import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { contrast, globalsCss, rootToken } from "./contrast";

test("the brand orange and the focus ring are unchanged", () => {
  expect(rootToken("primary")).toBe("oklch(0.64 0.21 37)");
  expect(rootToken("ring")).toBe("oklch(0.64 0.21 37)");
});

test("the filled orange's label (--primary-foreground) is at least 4.5:1 on it, at rest and on the solid hover", () => {
  expect(contrast(rootToken("primary"), rootToken("primary-foreground"))).toBeGreaterThanOrEqual(4.5);
  expect(contrast(rootToken("primary-hover"), rootToken("primary-foreground"))).toBeGreaterThanOrEqual(4.5);
});

test("bg-primary-hover is a Tailwind colour", () => {
  expect(globalsCss()).toMatch(/@theme inline \{[^}]*--color-primary-hover: var\(--primary-hover\);/);
});

const SRC = path.join(process.cwd(), "src");
const sources = (readdirSync(SRC, { recursive: true }) as string[]).filter((f) => /\.(ts|tsx|css)$/.test(f));

/** One orange button style: no second orange, no per-button label colour or darkened fill, no see-through hover. */
const BANNED = [/\bbg-cta\b/, /\bcta-hover\b/, /--cta\b/, /--color-cta\b/, /\bUNLOCK_BUTTON_CLASS\b/, /\bON_PRIMARY_TEXT\b/, /\bPRIMARY_FILL\b/, /hover:bg-primary\/[5-9][0-9]\b/];

test("src has one orange button style: no bg-cta, --cta, UNLOCK_BUTTON_CLASS, ON_PRIMARY_TEXT, PRIMARY_FILL or opacity hover on a filled orange", () => {
  expect(sources.length).toBeGreaterThan(50);
  const hits: string[] = [];
  for (const file of sources) {
    readFileSync(path.join(SRC, file), "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const pattern of BANNED) if (pattern.test(line)) hits.push(`src/${file}:${i + 1} ${pattern}`);
      });
  }
  expect(hits).toEqual([]);
});

test("tints of the orange (hover:bg-primary/10) are still allowed", () => {
  expect(BANNED.some((pattern) => pattern.test("hover:bg-primary/10"))).toBe(false);
  expect(BANNED.some((pattern) => pattern.test("[a]:hover:bg-primary/80"))).toBe(true);
});
