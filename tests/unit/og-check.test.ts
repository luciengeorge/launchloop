import { describe, expect, it } from "vitest";
import { checkOg, type OgImageInfo, type OgTags } from "@/lib/og-check";

const TAGS: OgTags = {
  ogTitle: "Pagebird: turn customer calls into product specs",
  ogDescription: "Upload a call recording and get ranked specs your team can build from.",
  ogImage: "https://pagebird.test/og.png",
  ogImageWidth: "1200",
  ogImageHeight: "630",
  ogImageAlt: "Pagebird's name and headline on a plain background",
  ogUrl: "https://pagebird.test/",
  twitterCard: "summary_large_image",
};

const IMAGE: OgImageInfo = {
  url: "https://pagebird.test/og.png",
  source: "og:image",
  relative: false,
  insecure: false,
  loaded: true,
  status: 200,
  contentType: "image/png",
  format: "png",
  width: 1200,
  height: 630,
  bytes: 120_000,
};

const sizeCheck = (image: OgImageInfo, tags: OgTags = TAGS) => checkOg(tags, image).checks.find((c) => c.id === "image-size")!;

describe("checkOg", () => {
  it("passes a well-tagged page with a 1200×630 PNG", () => {
    const result = checkOg(TAGS, IMAGE);
    expect(result.verdict).toBe("pass");
    expect(result.checks.map((c) => [c.id, c.status])).toEqual([
      ["title", "pass"],
      ["description", "pass"],
      ["image", "pass"],
      ["image-size", "pass"],
      ["image-tags", "pass"],
      ["twitter-card", "pass"],
      ["url", "pass"],
    ]);
    expect(sizeCheck(IMAGE).detail).toBe("Exactly 1200×630.");
  });

  it("warns, rather than fails, on an SVG and cites X's archived card docs", () => {
    const svg: OgImageInfo = { ...IMAGE, url: "https://pagebird.test/og.svg", contentType: "image/svg+xml", format: "svg", width: undefined, height: undefined };
    const check = sizeCheck(svg, { ...TAGS, ogImageWidth: undefined, ogImageHeight: undefined });
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("some platforms don't accept SVG");
    expect(check.detail).toContain("X's archived card docs say it isn't supported");
    expect(checkOg({ ...TAGS, ogImageWidth: undefined, ogImageHeight: undefined }, svg).verdict).toBe("warn");
  });

  it("fails an image under 600×315 with Facebook's wording, not a thumbnail claim", () => {
    const check = sizeCheck({ ...IMAGE, width: 500, height: 262 });
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("below 600×315");
    expect(check.detail).toContain('Facebook says a smaller image "will still display in the link page post, but the size will be much smaller."');
    expect(check.detail).not.toMatch(/thumbnail|not at all/);
  });

  it("only names Facebook for the first-share benefit of declaring width and height", () => {
    const tags = checkOg({ ...TAGS, ogImageWidth: undefined, ogImageHeight: undefined }, IMAGE).checks.find((c) => c.id === "image-tags")!;
    expect(tags.status).toBe("warn");
    expect(tags.detail).toContain("so Facebook can show the image on the very first share");
    expect(tags.detail).not.toContain("LinkedIn");
  });

  it("names no platform it has no source for", () => {
    const twitterOnly = checkOg(TAGS, { ...IMAGE, source: "twitter:image" }).checks.find((c) => c.id === "image")!;
    expect(twitterOnly.detail).not.toContain("iMessage");
    const relative = checkOg(TAGS, { ...IMAGE, relative: true }).checks.find((c) => c.id === "image")!;
    expect(relative.detail).toContain("relative");
    expect(relative.detail).not.toMatch(/many crawlers|most crawlers/);
  });
});
