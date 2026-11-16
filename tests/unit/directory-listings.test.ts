import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fitListing, generateListingCopy, listingFor, listingLimits } from "@/lib/copy";
import { parseDirectories } from "@/lib/directory-csv";
import { LIMITS, charLength } from "@/lib/limits";
import type { Brief } from "@/lib/schema";

vi.mock("@/lib/env", () => ({ env: { llmProvider: "mock" }, forceMock: true }));

const rows = parseDirectories(readFileSync(path.join(process.cwd(), "data/directory-pack/directories.csv"), "utf8"));
const brief: Brief = {
  name: "Snapshelf",
  oneLiner: "Snapshelf finds any screenshot on your Mac by the words in it, so you never scroll through a folder of Screenshot 2026 files again",
  audience: "designers and developers who take a lot of screenshots",
  problem: "",
  features: ["Searches the text inside every screenshot, offline", "Tags screenshots by app and window title", "Shares a screenshot as a link in one click"],
  proofPoints: [],
  stack: [],
  tone: "plain",
  url: "https://snapshelf.app/",
};

describe("listing limits", () => {
  it("uses a row's tagline_max and description_max, and the Product Hunt limits when they're blank", () => {
    expect(listingLimits({ tagline_max: 30, description_max: 120 })).toEqual({ tagline: 30, description: 120 });
    expect(listingLimits({ tagline_max: null, description_max: null })).toEqual({ tagline: LIMITS.phTagline, description: LIMITS.phDescription });
  });

  it("fits copy that's too long at a word boundary, never over the limit", () => {
    const long = { tagline: "word ".repeat(40), description: "longer words ".repeat(80) };
    for (const limits of [{ tagline: 1, description: 1 }, { tagline: 12, description: 40 }, { tagline: 60, description: 260 }]) {
      const fitted = fitListing(long, limits);
      expect(charLength(fitted.tagline)).toBeLessThanOrEqual(limits.tagline);
      expect(charLength(fitted.description)).toBeLessThanOrEqual(limits.description);
      expect(fitted.tagline).not.toBe("");
    }
    expect(fitListing({ tagline: "Find any screenshot.", description: "Short." }, { tagline: 60, description: 260 })).toEqual({ tagline: "Find any screenshot", description: "Short." });
  });
});

describe("generateListingCopy", () => {
  const tiny = [{ ...rows[0], tagline_max: 8, description_max: 20 }, { ...rows[0], tagline_max: 25, description_max: 70 }];

  it("writes one tagline and description per directory, each within that row's limits", async () => {
    const all = [...rows, ...tiny];
    const { listings } = await generateListingCopy(brief, all.map(listingLimits));
    for (const row of all) {
      const copy = listingFor(listings, row);
      const limits = listingLimits(row);
      expect(copy.tagline.trim(), row.name).not.toBe("");
      expect(copy.description.trim(), row.name).not.toBe("");
      expect(charLength(copy.tagline), `${row.name} tagline`).toBeLessThanOrEqual(limits.tagline);
      expect(charLength(copy.description), `${row.name} description`).toBeLessThanOrEqual(limits.description);
    }
  });

  it("asks once per distinct pair of limits", async () => {
    const { listings } = await generateListingCopy(brief, [...rows, ...tiny].map(listingLimits));
    expect(Object.keys(listings).sort()).toEqual([...new Set([...rows, ...tiny].map((r) => `${listingLimits(r).tagline}x${listingLimits(r).description}`))].sort());
  });

  it("still fits a row whose limits weren't generated (the CSV changed after the copy was written)", async () => {
    const { listings } = await generateListingCopy(brief, [listingLimits(rows[0])]);
    const copy = listingFor(listings, tiny[0]);
    expect(charLength(copy.tagline)).toBeLessThanOrEqual(8);
    expect(charLength(copy.description)).toBeLessThanOrEqual(20);
  });
});
