import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { DEFAULT_SHARE_HEADLINE, DEFAULT_SHARE_IMAGE } from "@/lib/site";

const DASHES = /[\u2013\u2014]/;
const source = (file: string) => readFileSync(path.join(import.meta.dirname, "../../src/app", file), "utf8");

describe("default share image", () => {
  it("shows the current headline, and its alt text says the same", () => {
    expect(DEFAULT_SHARE_HEADLINE.join(" ")).toBe("Your repo in. All your launch posts out.");
    expect(DEFAULT_SHARE_IMAGE).toEqual({ url: "/opengraph-image", alt: "LaunchLoop: Your repo in. All your launch posts out." });
  });

  it("is what the home page and pages without their own image share", () => {
    expect(PAGES.home.image).toEqual(DEFAULT_SHARE_IMAGE);
    const metadata = pageMetadata({ title: "Any page", description: "d", path: "/any" });
    expect(metadata.openGraph?.images).toEqual([{ ...DEFAULT_SHARE_IMAGE, width: 1200, height: 630 }]);
    expect(metadata.twitter?.images).toEqual([DEFAULT_SHARE_IMAGE]);
  });

  it("keeps its copy free of dashes, Ship Loop, the old headline and any price but £19", () => {
    for (const file of ["opengraph-image.tsx", "layout.tsx"]) {
      const text = `${source(file)} ${DEFAULT_SHARE_IMAGE.alt}`;
      expect(text, file).not.toMatch(DASHES);
      expect(text, file).not.toMatch(/Ship Loop|Paste your repo/i);
      for (const price of text.match(/£\s*\d+(\.\d+)?/g) ?? []) expect(price, file).toBe("£19");
    }
  });
});
