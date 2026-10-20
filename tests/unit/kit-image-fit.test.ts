import { describe, expect, it } from "vitest";
import { ELLIPSIS, fitText, textWidth, wrapText } from "@/lib/image-fit";
import { MAX_HEADLINE_LINES, MAX_PILL_LINES, planKitImage, X_HEADLINE_SIZES, type Box, type KitImageContent, type KitImagePlan } from "@/lib/image-layout";
import { IMAGE_VARIANTS, type ImageVariant } from "@/lib/image-variants";

const VARIANTS = Object.keys(IMAGE_VARIANTS) as ImageVariant[];

const LONG: KitImageContent = {
  name: "Haypile",
  tagline: "Everything you've bookmarked on X, GitHub, YouTube, Pinterest, Reddit and your browser, searchable in one place, by meaning",
  headline:
    "A unified, always-synced home for everything you've saved across the internet with GitHub, YouTube, Pinterest and Reddit bookmarks, searchable by text, image and video in one place",
  features: [
    'Multimodal search: type "red car" and actual images or video moments surface across all sources',
    "Syncs bookmarks from X, GitHub, YouTube, Pinterest, Reddit, and browser automatically",
    "Google Gemini embedding pipeline (text + image + video in shared vector space)",
  ],
  domain: "github.com/luciengeorge/haypile",
};

const SHORT: KitImageContent = {
  name: "Shelfie",
  tagline: "Your bookshelf, finally organised",
  headline: "Know every book you own",
  features: ["Barcode scan", "Shelf export", "Friend lending"],
  domain: "shelfie.app",
};

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const contains = (outer: Box, inner: Box) =>
  inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.x + inner.width <= outer.x + outer.width + 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;

/** Card text sits inside its card, so only sibling blocks are compared. */
const parentOf = (id: string) => id.match(/^(card-\d+)-/)?.[1];

function expectNoOverlap(plan: KitImagePlan) {
  const content: Box = { x: plan.padding, y: plan.padding, width: plan.width - 2 * plan.padding, height: plan.height - 2 * plan.padding };
  for (const { id, box } of plan.boxes) {
    expect(contains(content, box), `${plan.variant}: ${id} ${JSON.stringify(box)} escapes the frame`).toBe(true);
    const parent = parentOf(id);
    if (parent) expect(contains(plan.boxes.find((b) => b.id === parent)!.box, box), `${id} escapes ${parent}`).toBe(true);
  }
  for (const [i, a] of plan.boxes.entries()) {
    for (const b of plan.boxes.slice(i + 1)) {
      if (parentOf(a.id) === b.id || parentOf(b.id) === a.id) continue;
      expect(overlaps(a.box, b.box), `${plan.variant}: ${a.id} overlaps ${b.id}`).toBe(false);
    }
  }
}

describe("fitText", () => {
  it("measures wider text as wider and wraps within the width", () => {
    expect(textWidth("WWW", 40)).toBeGreaterThan(textWidth("iii", 40));
    for (const line of wrapText(LONG.headline, 60, 800)) expect(textWidth(line, 60)).toBeLessThanOrEqual(800);
  });

  it("keeps short text at the largest size, untouched", () => {
    const fit = fitText(SHORT.headline, { sizes: X_HEADLINE_SIZES, maxWidth: 1300, maxLines: 3, lineHeight: 1.08, letterSpacing: -2 });
    expect(fit.fontSize).toBe(92);
    expect(fit.lines.join(" ")).toBe(SHORT.headline);
    expect(fit.truncated).toBe(false);
  });

  it("steps the size down for long text until it fits in the line cap", () => {
    const fit = fitText(LONG.headline.slice(0, 130), { sizes: X_HEADLINE_SIZES, maxWidth: 1300, maxLines: 3, lineHeight: 1.08, letterSpacing: -2 });
    expect(fit.fontSize).toBeLessThan(92);
    expect(fit.lines.length).toBeLessThanOrEqual(3);
    expect(fit.truncated).toBe(false);
  });

  it("truncates at a word boundary with an ellipsis when even the smallest size overflows", () => {
    const text = `${LONG.headline} ${LONG.headline}`;
    const fit = fitText(text, { sizes: [60, 50], maxWidth: 900, maxLines: 3, lineHeight: 1.1 });
    expect(fit.fontSize).toBe(50);
    expect(fit.lines).toHaveLength(3);
    expect(fit.truncated).toBe(true);
    const last = fit.lines[2];
    expect(last.endsWith(ELLIPSIS)).toBe(true);
    expect(text.startsWith(fit.lines.join(" ").slice(0, -1))).toBe(true);
    for (const line of fit.lines) expect(textWidth(line, 50)).toBeLessThanOrEqual(900);
  });

  it("respects maxHeight as a line cap", () => {
    const fit = fitText(LONG.headline, { sizes: [40], maxWidth: 400, maxLines: 10, lineHeight: 1.25, maxHeight: 100 });
    expect(fit.lines).toHaveLength(2);
    expect(fit.height).toBeLessThanOrEqual(100);
  });
});

describe("kit image layout", () => {
  for (const variant of VARIANTS) {
    it(`${variant}: a very long headline and three long pills never overlap`, () => {
      const plan = planKitImage(variant, LONG);
      expectNoOverlap(plan);
      if (plan.variant === "x") {
        expect(plan.headline.lines.length).toBeLessThanOrEqual(MAX_HEADLINE_LINES);
        expect(plan.headline.fontSize).toBeLessThan(92);
        expect(plan.pills.length).toBeGreaterThan(0);
        expect(plan.pills.length).toBeLessThanOrEqual(3);
        for (const pill of plan.pills) expect(pill.text.lines.length).toBeLessThanOrEqual(MAX_PILL_LINES);
      }
    });

    it(`${variant}: short copy keeps the original sizes`, () => {
      const plan = planKitImage(variant, SHORT);
      expectNoOverlap(plan);
      switch (plan.variant) {
        case "x":
          expect(plan.headline.fontSize).toBe(92);
          expect(plan.headline.lines).toEqual([SHORT.headline]);
          expect(plan.pills.map((p) => [p.text.fontSize, p.text.lines.join(" ")])).toEqual(SHORT.features.map((f) => [32, f]));
          break;
        case "og":
          expect([plan.name.fontSize, plan.tagline.fontSize]).toEqual([96, 44]);
          break;
        case "ph":
          expect([plan.name.fontSize, plan.tagline.fontSize]).toEqual([84, 42]);
          expect(plan.cards.map((c) => c.text.fontSize)).toEqual([38, 38, 38]);
          break;
      }
    });
  }

  it("x: drops pills rather than overlapping when they cannot all fit", () => {
    const huge = "Extraordinarily long feature description that keeps going well past what any pill can hold on one line";
    const plan = planKitImage("x", { ...LONG, features: [huge, huge, huge] });
    expectNoOverlap(plan);
    expect(plan.variant === "x" && plan.pills.length).toBeLessThanOrEqual(3);
  });

  it("handles an empty headline, tagline and no features", () => {
    for (const variant of VARIANTS) expectNoOverlap(planKitImage(variant, { name: "X", tagline: "", headline: "", features: [], domain: "" }));
  });
});
