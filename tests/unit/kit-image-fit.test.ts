import { describe, expect, it } from "vitest";
import { ELLIPSIS, fitText, textWidth, wrapText } from "@/lib/image-fit";
import {
  MAX_NAME_LINES,
  MAX_PILL_LINES,
  MAX_TAGLINE_LINES,
  monogram,
  monogramFontSize,
  planKitImage,
  X_NAME_SIZES,
  type Box,
  type KitImageContent,
  type KitImageMedia,
  type KitImagePlan,
} from "@/lib/image-layout";
import { IMAGE_VARIANTS, type ImageVariant } from "@/lib/image-variants";

const VARIANTS = Object.keys(IMAGE_VARIANTS) as ImageVariant[];

const LONG: KitImageContent = {
  name: "Haypile Bookmark Search Studio",
  tagline: "Everything you've bookmarked on X, GitHub, YouTube, Pinterest, Reddit and your browser, searchable in one place, by meaning",
  headline:
    "A unified, always-synced home for everything you've saved across the internet with GitHub, YouTube, Pinterest and Reddit bookmarks, searchable by text, image and video in one place",
  features: [
    'Multimodal search: type "red car" and actual images or video moments surface across all sources',
    "Syncs bookmarks from X, GitHub, YouTube, Pinterest, Reddit, and browser automatically",
    "Google Gemini embedding pipeline (text + image + video in shared vector space)",
  ],
  domain: "github.com/luciengeorge/haypile-with-a-long-name",
};

const SHORT: KitImageContent = {
  name: "Shelfie",
  tagline: "Your bookshelf, finally organised",
  headline: "Know every book you own",
  features: ["Barcode scan", "Shelf export", "Friend lending"],
  domain: "shelfie.app",
};

const EMPTY: KitImageContent = { name: "X", tagline: "", headline: "", features: [], domain: "" };

const SHOTS = { landscape: { width: 2880, height: 1800 }, wide: { width: 2400, height: 1000 }, og: { width: 1200, height: 630 } };
const MEDIA: [string, KitImageMedia][] = [
  ["no screenshot", { watermark: false }],
  ["no screenshot, watermarked", { watermark: true }],
  ...Object.entries(SHOTS).flatMap(([label, screenshot]): [string, KitImageMedia][] => [
    [`${label} screenshot`, { screenshot, watermark: false }],
    [`${label} screenshot, watermarked`, { screenshot, watermark: true }],
  ]),
];

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
const contains = (outer: Box, inner: Box) =>
  inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.x + inner.width <= outer.x + outer.width + 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;

/** Card text sits inside its card, so only sibling blocks are compared. */
const parentOf = (id: string) => id.match(/^(card-\d+)-/)?.[1];

function expectNoOverlap(plan: KitImagePlan) {
  const canvas: Box = { x: 0, y: 0, width: plan.width, height: plan.height };
  const content: Box = { x: plan.padding, y: plan.padding, width: plan.width - 2 * plan.padding, height: plan.height - 2 * plan.padding };
  const where = (id: string) => `${plan.variant}/${plan.layout}: ${id}`;
  for (const { id, box, layer } of plan.boxes) {
    expect(box.width, `${where(id)} has no width`).toBeGreaterThan(0);
    if (layer === "content") expect(contains(content, box), `${where(id)} ${JSON.stringify(box)} escapes the padded frame`).toBe(true);
    if (layer === "overlay") expect(contains(canvas, box), `${where(id)} escapes the canvas`).toBe(true);
    // The screenshot frame may run off the right and bottom edges, but starts on the canvas with room to show.
    if (layer === "media") expect(box.x >= 0 && box.y >= 0 && box.x < plan.width - 300 && box.y < plan.height - 250, `${where(id)} is off the canvas`).toBe(true);
    const parent = parentOf(id);
    if (parent) expect(contains(plan.boxes.find((b) => b.id === parent)!.box, box), `${id} escapes ${parent}`).toBe(true);
  }
  for (const [i, a] of plan.boxes.entries()) {
    for (const b of plan.boxes.slice(i + 1)) {
      if (parentOf(a.id) === b.id || parentOf(b.id) === a.id) continue;
      // The badge is a sticker: it may sit on the screenshot, never on text.
      if ((a.layer === "media" && b.layer === "overlay") || (a.layer === "overlay" && b.layer === "media")) continue;
      expect(overlaps(a.box, b.box), `${where(a.id)} overlaps ${b.id}`).toBe(false);
    }
  }
}

function textBlocks(plan: KitImagePlan) {
  const blocks = [plan.name];
  if (plan.variant === "x") {
    if (plan.headline) blocks.push(plan.headline);
    if (plan.domain) blocks.push(plan.domain);
  } else {
    if (plan.tagline) blocks.push(plan.tagline);
    if (plan.domain && !("padX" in plan.domain)) blocks.push(plan.domain);
  }
  if (plan.variant === "ph") blocks.push(...plan.features.map((f) => f.text), ...plan.cards.flatMap((c) => [c.number, c.text]));
  return blocks;
}

describe("fitText", () => {
  it("measures wider text as wider, and bold wider than regular", () => {
    expect(textWidth("WWW", 40)).toBeGreaterThan(textWidth("iii", 40));
    expect(textWidth("Haypile", 80, 0, 700)).toBeGreaterThan(textWidth("Haypile", 80, 0, 400));
    for (const line of wrapText(LONG.headline, 60, 800)) expect(textWidth(line, 60)).toBeLessThanOrEqual(800);
    for (const line of wrapText(LONG.headline, 60, 800, -2, 700)) expect(textWidth(line, 60, -2, 700)).toBeLessThanOrEqual(800);
  });

  it("keeps short text at the largest size, untouched", () => {
    const fit = fitText(SHORT.headline, { sizes: [92, 80], maxWidth: 1300, maxLines: 3, lineHeight: 1.08, letterSpacing: -2, weight: 700 });
    expect(fit.fontSize).toBe(92);
    expect(fit.weight).toBe(700);
    expect(fit.lines.join(" ")).toBe(SHORT.headline);
    expect(fit.truncated).toBe(false);
  });

  it("steps the size down for long text until it fits in the line cap", () => {
    const fit = fitText(LONG.headline.slice(0, 130), { sizes: [92, 80, 68, 58, 50], maxWidth: 1300, maxLines: 3, lineHeight: 1.08, letterSpacing: -2 });
    expect(fit.fontSize).toBeLessThan(92);
    expect(fit.lines.length).toBeLessThanOrEqual(3);
    expect(fit.truncated).toBe(false);
  });

  it("truncates at a word boundary with an ellipsis when even the smallest size overflows", () => {
    const text = `${LONG.headline} ${LONG.headline}`;
    const fit = fitText(text, { sizes: [60, 50], maxWidth: 900, maxLines: 3, lineHeight: 1.1, weight: 600 });
    expect(fit.fontSize).toBe(50);
    expect(fit.lines).toHaveLength(3);
    expect(fit.truncated).toBe(true);
    expect(fit.lines[2].endsWith(ELLIPSIS)).toBe(true);
    expect(text.startsWith(fit.lines.join(" ").slice(0, -1))).toBe(true);
    for (const line of fit.lines) expect(textWidth(line, 50, 0, 600)).toBeLessThanOrEqual(900);
  });

  it("respects maxHeight as a line cap", () => {
    const fit = fitText(LONG.headline, { sizes: [40], maxWidth: 400, maxLines: 10, lineHeight: 1.25, maxHeight: 100 });
    expect(fit.lines).toHaveLength(2);
    expect(fit.height).toBeLessThanOrEqual(100);
  });
});

describe("monogram", () => {
  it.each([
    ["Is Odd", "IO"],
    ["is-odd", "IO"],
    ["Rocket Skates Studio", "RS"],
    ["PostHog", "PH"],
    ["LaunchLoop", "LL"],
    ["trigger.dev", "Tr"],
    ["Cal.com", "Ca"],
    ["API", "AP"],
    ["Écrire", "Éc"],
    ["X", "X"],
    ["!!!", "•"],
  ])("%s → %s", (name, letters) => {
    expect(monogram(name)).toBe(letters);
  });

  it("two letters are never a lone narrow glyph, and the widest pair still fits the tile", () => {
    expect([...monogram("Is Odd")].length).toBe(2);
    for (const variant of VARIANTS) {
      const { mark } = planKitImage(variant, { ...LONG, name: "Is Odd" });
      for (const letters of ["IO", "WM", "MW"]) {
        const size = monogramFontSize(letters, mark.box);
        expect(textWidth(letters, size, 0, 700), `${variant} ${letters}`).toBeLessThanOrEqual(mark.box.width * 0.64 + 0.01);
        expect(size).toBeLessThanOrEqual(mark.box.height * 0.46);
      }
      expect(monogramFontSize("I", mark.box)).toBeCloseTo(mark.box.height * 0.54);
    }
  });
});

describe("kit image layout", () => {
  for (const variant of VARIANTS) {
    for (const [label, media] of MEDIA) {
      for (const [copy, content] of [
        ["long", LONG],
        ["short", SHORT],
        ["empty", EMPTY],
      ] as const) {
        it(`${variant}, ${label}, ${copy} copy: nothing overlaps or leaves the frame`, () => {
          const plan = planKitImage(variant, content, media);
          expect([plan.width, plan.height]).toEqual([IMAGE_VARIANTS[variant].width, IMAGE_VARIANTS[variant].height]);
          expect(plan.layout).toBe(media.screenshot ? "shot" : "type");
          expect(!!plan.badge).toBe(media.watermark);
          expect(!!plan.shot).toBe(!!media.screenshot);
          expectNoOverlap(plan);
          expect(plan.name.text.lines.length).toBeLessThanOrEqual(MAX_NAME_LINES);
          for (const block of textBlocks(plan)) {
            expect(block.box.width).toBeLessThanOrEqual(plan.width - 2 * plan.padding + 0.5);
            expect(block.text.height).toBeCloseTo(block.text.lines.length * block.text.fontSize * block.text.lineHeight);
          }
          if (plan.variant !== "x" && plan.tagline) expect(plan.tagline.text.lines.length).toBeLessThanOrEqual(MAX_TAGLINE_LINES);
          if (plan.variant === "x" && plan.headline) expect(plan.headline.text.lines.length).toBeLessThanOrEqual(MAX_TAGLINE_LINES);
          if (plan.variant === "x") for (const pill of plan.pills) expect(pill.text.lines.length).toBeLessThanOrEqual(MAX_PILL_LINES);
        });
      }
    }
  }

  it("long copy shrinks, then clamps with an ellipsis, instead of overflowing", () => {
    for (const variant of VARIANTS) {
      for (const media of [{ watermark: true }, { screenshot: SHOTS.landscape, watermark: true }]) {
        const short = planKitImage(variant, SHORT, media);
        const plan = planKitImage(variant, LONG, media);
        const copyOf = (p: KitImagePlan) => (p.variant === "x" ? p.headline : p.tagline);
        const copy = copyOf(plan);
        expect(copy, `${variant}/${plan.layout} lost its tagline`).not.toBeNull();
        expect(copy!.text.fontSize, `${variant}/${plan.layout}`).toBeLessThan(copyOf(short)!.text.fontSize);
        if (copy!.text.truncated) expect(copy!.text.lines.at(-1)!.endsWith(ELLIPSIS)).toBe(true);
        else expect(copy!.text.lines.join(" ")).toBe(variant === "x" ? LONG.headline : LONG.tagline);
      }
    }
    // Twice the copy can't fit anywhere: it must clamp.
    const doubled = { ...LONG, tagline: `${LONG.tagline} ${LONG.tagline}`, headline: `${LONG.headline} ${LONG.headline}` };
    for (const variant of VARIANTS) {
      const plan = planKitImage(variant, doubled, { watermark: true });
      const copy = plan.variant === "x" ? plan.headline : plan.tagline;
      expect(copy!.text.truncated, variant).toBe(true);
      expect(copy!.text.lines.at(-1)!.endsWith(ELLIPSIS)).toBe(true);
    }
  });

  it("short copy keeps the largest sizes in every layout", () => {
    const sizes = (variant: ImageVariant, media: KitImageMedia) => {
      const plan = planKitImage(variant, SHORT, media);
      const copy = plan.variant === "x" ? plan.headline : plan.tagline;
      return [plan.name.text.fontSize, copy?.text.fontSize];
    };
    expect(sizes("og", { watermark: true })).toEqual([124, 44]);
    expect(sizes("og", { screenshot: SHOTS.landscape, watermark: true })).toEqual([84, 34]);
    expect(sizes("x", { watermark: true })).toEqual([X_NAME_SIZES[0], 50]);
    expect(sizes("x", { screenshot: SHOTS.landscape, watermark: true })).toEqual([92, 42]);
    expect(sizes("ph", { watermark: true })).toEqual([96, 36]);
    expect(sizes("ph", { screenshot: SHOTS.landscape, watermark: true })).toEqual([72, 30]);
    const x = planKitImage("x", SHORT, { watermark: true });
    expect(x.variant === "x" && x.pills.map((p) => [p.text.fontSize, p.text.lines.join(" ")])).toEqual(SHORT.features.map((f) => [30, f]));
  });

  it("x: pills that can't fit on two lines clamp with an ellipsis, and never overlap", () => {
    const huge = "Extraordinarily long feature description that keeps going well past what any pill can hold on one line, and then some more words, ".repeat(2);
    const plan = planKitImage("x", { ...LONG, features: [huge, huge, huge] }, { watermark: true });
    expectNoOverlap(plan);
    if (plan.variant !== "x") throw new Error("expected an x plan");
    expect(plan.pills.length).toBeGreaterThan(0);
    for (const pill of plan.pills) {
      expect(pill.text.lines).toHaveLength(MAX_PILL_LINES);
      expect(pill.text.lines.at(-1)!.endsWith(ELLIPSIS)).toBe(true);
    }
  });

  it("ph: every feature card uses one font size", () => {
    const plan = planKitImage("ph", { ...SHORT, features: ["Scan", "Export every shelf to a spreadsheet in one click", LONG.features[0]] }, { watermark: false });
    expect(plan.variant === "ph" && new Set(plan.cards.map((c) => c.text.text.fontSize)).size).toBe(1);
  });

  it("ph: the screenshot layout lists features beside the shot", () => {
    const plan = planKitImage("ph", SHORT, { screenshot: SHOTS.landscape, watermark: false });
    expect(plan.variant === "ph" && plan.features.map((f) => f.text.text.lines.join(" "))).toEqual(SHORT.features);
    expect(plan.variant === "ph" && plan.cards).toEqual([]);
  });

  it("the screenshot always covers the visible part of its frame", () => {
    for (const variant of VARIANTS) {
      for (const screenshot of Object.values(SHOTS)) {
        const { shot, width, height } = planKitImage(variant, SHORT, { screenshot, watermark: false });
        const visibleWidth = Math.min(shot!.frame.x + shot!.frame.width, width) - shot!.frame.x - 2 * shot!.border;
        const visibleHeight = Math.min(shot!.frame.y + shot!.frame.height, height) - shot!.frame.y - shot!.toolbar;
        expect(shot!.image.width).toBeGreaterThanOrEqual(visibleWidth);
        expect(shot!.image.height).toBeGreaterThanOrEqual(visibleHeight - 0.5);
        expect(shot!.image.width / shot!.image.height).toBeCloseTo(screenshot.width / screenshot.height);
      }
    }
  });
});
