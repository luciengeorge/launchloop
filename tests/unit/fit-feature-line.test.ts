import { describe, expect, it } from "vitest";
import { ELLIPSIS, type FittedText } from "@/lib/image-fit";
import { planKitImage, X_PILL_SIZES, type KitImageContent, type KitImageMedia } from "@/lib/image-layout";
import { IMAGE_VARIANTS, type ImageVariant } from "@/lib/image-variants";

/** Equivalent to sonner's (emilkowalski/sonner, 8e4662b3) feature line that ellipsized in the Product Hunt image on 27 Oct. */
const SONNER_LINE = "Works out of the box with Next.js App Router, Server Components, Remix, Vite and Astro, with no providers or extra setup";
/** Three lines at today's smallest pill size (24 px), two at 75% of the 30 px base. */
const TWO_LINES_AT_75 =
  "Syncs every bookmark from X, GitHub, YouTube, Pinterest, Reddit and your browser on its own, then searches all of them by meaning across text, images and video, so the thing you saved last year turns up in a few seconds";
/** Three lines even at 75% of the pill base. */
const THREE_LINES_AT_75 =
  "Syncs every bookmark from X, GitHub, YouTube, Pinterest, Reddit, Hacker News and your browser on its own, then searches all of them by meaning across text, images and video moments, so the post, repo or clip you saved last year turns up in a few seconds";
/** Four lines at 75% of the pill base: more than the full budget holds. */
const OVER_BUDGET_AT_75 =
  "Syncs every bookmark from X, GitHub, YouTube, Pinterest, Reddit, Hacker News, Raindrop, Pocket and your browser on its own, then searches all of them by meaning across text, images and video moments, so the post, repo, thread or clip you saved last year turns up in a few seconds, with the exact moment highlighted, and shares a collection with your team as a single link anyone can open";

const PILL_MIN = X_PILL_SIZES[0] * 0.75;
/** planPh's largest card size. */
const CARD_BASE = 32;

const sonner = (firstFeature: string): KitImageContent => ({
  name: "Sonner",
  tagline: "An opinionated toast component for React",
  headline: "Toasts that look good by default",
  features: [firstFeature, "Swipe to dismiss", "Promise toasts"],
  domain: "github.com/emilkowalski/sonner",
});

const ellipsized = (text: FittedText) => text.lines.some((line) => line.includes(ELLIPSIS));

function firstPill(feature: string) {
  const plan = planKitImage("x", sonner(feature), { watermark: true });
  if (plan.variant !== "x" || plan.layout !== "type") throw new Error("expected the type-led X layout");
  expect(plan.pills.length, "the first feature is drawn as a pill").toBeGreaterThan(0);
  return plan.pills[0].text;
}

describe("feature lines in the kit images", () => {
  it("the sonner line is never ellipsized, in any size or layout", () => {
    const media: KitImageMedia[] = [{ watermark: true }, { watermark: false }, { screenshot: { width: 1600, height: 1000 }, watermark: true }, { screenshot: { width: 1600, height: 1000 }, watermark: false }];
    const clipped: string[] = [];
    for (const variant of Object.keys(IMAGE_VARIANTS) as ImageVariant[]) {
      for (const m of media) {
        const plan = planKitImage(variant, sonner(SONNER_LINE), m);
        const lines = plan.variant === "x" ? plan.pills.map((p) => p.text) : plan.variant === "ph" ? [...plan.features.map((f) => f.text.text), ...plan.cards.map((c) => c.text.text)] : [];
        for (const text of lines) if (ellipsized(text)) clipped.push(`${variant}/${plan.layout}${m.watermark ? " watermarked" : ""}: ${JSON.stringify(text.lines)}`);
      }
    }
    expect(clipped).toEqual([]);
  });

  it("PH cards keep their 6-line wrap and shrink no further than 75% of the base size when that fits", () => {
    const plan = planKitImage("ph", sonner(SONNER_LINE), { watermark: true });
    if (plan.variant !== "ph" || plan.layout !== "type") throw new Error("expected the type-led PH layout");
    const { text } = plan.cards[0].text;
    expect(ellipsized(text), JSON.stringify(text.lines)).toBe(false);
    expect(text.lines.join(" ")).toBe(SONNER_LINE);
    expect(text.lines.length).toBeLessThanOrEqual(6);
    expect(text.fontSize).toBeGreaterThanOrEqual(CARD_BASE * 0.75);
  });

  it("an X pill shrinks toward 75% of its base to stay on two lines, with no ellipsis", () => {
    const text = firstPill(TWO_LINES_AT_75);
    expect(ellipsized(text), JSON.stringify(text.lines)).toBe(false);
    expect(text.lines.join(" ")).toBe(TWO_LINES_AT_75);
    expect(text.lines).toHaveLength(2);
    expect(text.fontSize).toBeGreaterThanOrEqual(PILL_MIN);
  });

  it("an X pill that two lines can't hold at 75% takes a third line at 75%, with no ellipsis", () => {
    const text = firstPill(THREE_LINES_AT_75);
    expect(ellipsized(text), JSON.stringify(text.lines)).toBe(false);
    expect(text.lines.join(" ")).toBe(THREE_LINES_AT_75);
    expect(text.lines).toHaveLength(3);
    expect(text.fontSize).toBe(PILL_MIN);
  });

  it("an ellipsis is a last resort: only at 75% of the base, on the full three-line budget", () => {
    const text = firstPill(OVER_BUDGET_AT_75);
    expect(ellipsized(text)).toBe(true);
    expect(text.fontSize, "ellipsized above 75% of the base").toBe(PILL_MIN);
    expect(text.lines, "ellipsized before the third line").toHaveLength(3);
  });
});
