import { describe, expect, it } from "vitest";
import { checkOg, OG_IMAGE_MAX_BYTES, type OgImageInfo, type OgTags } from "@/lib/og-check";

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

  it("cites X's archived 70-character title limit, with no unsourced 60 or LinkedIn and Slack claim", () => {
    const title = checkOg({ ...TAGS, ogTitle: "x".repeat(85) }, IMAGE).checks.find((c) => c.id === "title")!;
    expect(title.status).toBe("warn");
    expect(title.detail).toBe('og:title is 85 characters. X\'s archived card docs give a card title a maximum of 70 characters ("max 70 characters"), so lead with the words that matter.');
    expect(title.detail).not.toMatch(/\b60\b|LinkedIn|Slack/);
    expect(checkOg({ ...TAGS, ogTitle: "x".repeat(70) }, IMAGE).checks.find((c) => c.id === "title")!.status).toBe("pass");
  });

  it("fails a page with no og:image without claiming anything about clicks", () => {
    const image = checkOg(TAGS).checks.find((c) => c.id === "image")!;
    expect(image.status).toBe("fail");
    expect(image.detail).toBe("No og:image, so there's no share image for apps to show. Add a 1200×630 PNG or JPG.");
    expect(image.detail).not.toMatch(/clicks/);
  });

  it("accepts 1.91:1 through X's 2:1, so 1200×600 doesn't warn 'too wide'", () => {
    const twoToOne = sizeCheck({ ...IMAGE, width: 1200, height: 600 });
    expect(twoToOne.status).toBe("pass");
    expect(twoToOne.detail).toBe("1200×600: between 1.91:1 and 2:1, and at least 1200 wide.");
    expect(twoToOne.detail).not.toContain("too wide");
    expect(sizeCheck({ ...IMAGE, width: 1600, height: 840 }).status).toBe("pass");

    const wide = sizeCheck({ ...IMAGE, width: 1400, height: 630 });
    expect(wide.status).toBe("warn");
    expect(wide.detail).toContain("too wide, so the sides may be cropped");
    expect(wide.detail).toContain("Facebook and LinkedIn ask for 1.91:1 and X's archived docs describe 2:1");

    const tall = sizeCheck({ ...IMAGE, width: 1200, height: 1200 });
    expect(tall.status).toBe("warn");
    expect(tall.detail).toContain("too tall, so the top and bottom may be cropped");
    expect(tall.detail).not.toContain("Cards are 1.91:1");
  });

  it("flags files of 5,000,000 bytes or more, since X's archived docs say less than 5MB", () => {
    expect(OG_IMAGE_MAX_BYTES).toBe(5_000_000);
    expect(sizeCheck({ ...IMAGE, bytes: 4_999_999 })).toMatchObject({ status: "pass", detail: "Exactly 1200×630." });
    for (const bytes of [5_000_000, 5_100_000, 5_240_000]) {
      const check = sizeCheck({ ...IMAGE, bytes });
      expect(check.status, String(bytes)).toBe("warn");
      expect(check.detail).toContain(`The file is ${(bytes / 1_000_000).toFixed(1)} MB. X's archived docs say images must be less than 5MB`);
    }
  });

  it("cites X's archived 200-character description limit, and its large card for summary_large_image", () => {
    const long = checkOg({ ...TAGS, ogDescription: "x".repeat(201) }, IMAGE).checks.find((c) => c.id === "description")!;
    expect(long.status).toBe("warn");
    expect(long.detail).toBe('og:description is 201 characters. X\'s archived card docs give a card description a maximum of 200 characters ("maximum 200 characters"), so put the point first.');
    expect(checkOg(TAGS, IMAGE).checks.find((c) => c.id === "twitter-card")!.detail).toContain('"a large, full-width prominent image"');
  });

  it("has no unsourced platform claims in any note", () => {
    const scenarios: [OgTags, OgImageInfo | undefined][] = [
      [TAGS, IMAGE],
      [{}, undefined],
      [{ title: "Pagebird", description: "Specs from calls." }, { ...IMAGE, relative: true, insecure: true, source: "twitter:image" }],
      [{ ...TAGS, ogDescription: undefined, description: "Specs from calls." }, { ...IMAGE, width: 1000, height: 500, bytes: 6_000_000 }],
      [{ ...TAGS, ogImageAlt: undefined, twitterCard: "summary", ogUrl: undefined, canonical: "https://pagebird.test/" }, { ...IMAGE, width: 800, height: 800 }],
      [{ ...TAGS, twitterCard: undefined, ogUrl: undefined, ogImageWidth: "1000", ogImageHeight: "500" }, { ...IMAGE, width: 1400, height: 630 }],
    ];
    const details = scenarios.flatMap(([tags, image]) => checkOg(tags, image).checks.map((c) => c.detail));
    expect(details.length).toBeGreaterThan(30);
    for (const detail of details) {
      expect(detail).not.toMatch(/nobody clicks|fewer clicks|Some apps|others show nothing|Most cards|about 155|every app|square thumbnail|count as one link|looks soft|sharp enough|screen readers|Cards are 1\.91|iMessage|many crawlers|most apps/);
      expect(detail).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it("names no platform it has no source for", () => {
    const twitterOnly = checkOg(TAGS, { ...IMAGE, source: "twitter:image" }).checks.find((c) => c.id === "image")!;
    expect(twitterOnly.detail).not.toContain("iMessage");
    const relative = checkOg(TAGS, { ...IMAGE, relative: true }).checks.find((c) => c.id === "image")!;
    expect(relative.detail).toContain("relative");
    expect(relative.detail).not.toMatch(/many crawlers|most crawlers/);
  });
});
