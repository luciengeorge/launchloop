import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { llmsText } from "@/lib/llms";
import { PAGES, indexablePages, pricedPage, toolPage } from "@/lib/pages";
import { kitPricePlain, siteDescription } from "@/lib/site";
import { launchLoopApp, siteGraph } from "@/lib/structured-data";
import { OG_PREVIEW, TAGLINE_CHECKER } from "@/lib/tools";

const BASE = "https://launchloop.dev";
const PROMO = "£14 (launch price, normally £19)";

/** Every £19 in promo copy is the "normally £19" half of the launch price. */
const strayFullPrice = (text: string) => text.replaceAll("normally £19", "").includes("£19");

test.describe("llms.txt follows the launch promo", () => {
  for (const full of [false, true]) {
    const name = full ? "llms-full.txt" : "llms.txt";

    test(`${name} on: £14 launch price, normally £19, everywhere it names the kit price`, () => {
      const text = llmsText(BASE, full, true);
      expect(text).toContain(`Free preview, then the full kit for ${PROMO}, paid once.`);
      expect(text).toContain(`One payment of ${PROMO}, for one app.`);
      expect(text).toContain(`- Launch Kit: ${PROMO} once, for one app, paid through Stripe Checkout.`);
      expect(text).toContain(`free preview, the Launch Kit at ${PROMO}, Ship Loop plans`);
      expect(text).toContain(`Then the full kit for ${PROMO}.`);
      expect(text).not.toContain("{kitPrice}");
      expect(strayFullPrice(text)).toBe(false);
    });

    test(`${name} off: the plain £19 and no £14`, () => {
      const text = llmsText(BASE, full, false);
      expect(text).toContain("Free preview, then the full kit for £19, paid once.");
      expect(text).toContain("- Launch Kit: £19 once, for one app");
      expect(text).not.toContain("£14");
      expect(text).not.toContain("{kitPrice}");
    });
  }

  test("llms-full.txt's FAQ asks about the launch price", () => {
    expect(llmsText(BASE, true, true)).toContain(`### What do I get for ${PROMO}?`);
    expect(llmsText(BASE, true, false)).toContain("### What do I get for £19?");
  });
});

test.describe("meta tags and JSON-LD follow the launch promo", () => {
  test("site description", () => {
    expect(siteDescription(true)).toMatch(/Free preview, then the full kit for £14 \(launch price, normally £19\), paid once\.$/);
    expect(siteDescription(false)).toMatch(/Free preview, then the full kit for £19, paid once\.$/);
  });

  test("/pricing title and description", () => {
    const on = pricedPage(PAGES.pricing, true);
    expect(on.title).toBe("Pricing: free preview, £14 kit (normally £19)");
    expect(on.description).toBe(`Try LaunchLoop free, then pay ${PROMO} once for a launch kit: landing copy, Product Hunt post, X thread, LinkedIn post and images.`);
    const off = pricedPage(PAGES.pricing, false);
    expect(off.title).toBe("Pricing: free preview, £19 kit and Ship Loop");
    expect(off.description).toContain("then pay £19 once");
    expect(off.description).not.toContain("£14");
  });

  test("tagline checker and OG preview descriptions", () => {
    for (const tool of [TAGLINE_CHECKER, OG_PREVIEW]) {
      expect(pricedPage(toolPage(tool), true).description).toMatch(/Then the full kit for £14 \(launch price, normally £19\)\.$/);
      expect(pricedPage(toolPage(tool), false).description).toMatch(/Then the full kit for £19\.$/);
    }
  });

  test("every page's title and description fit the SEO limits with the promo on and off", () => {
    for (const promo of [false, true]) {
      for (const page of indexablePages()) {
        const priced = pricedPage(page, promo);
        const title = priced.absoluteTitle ? priced.title : `${priced.title} · LaunchLoop`;
        expect(title.length, `${page.path} title, promo ${promo}`).toBeGreaterThanOrEqual(50);
        expect(title.length, `${page.path} title, promo ${promo}`).toBeLessThanOrEqual(60);
        expect(priced.description.length, `${page.path} description, promo ${promo}`).toBeGreaterThanOrEqual(120);
        expect(priced.description.length, `${page.path} description, promo ${promo}`).toBeLessThanOrEqual(160);
        expect(priced.description).not.toContain("{kitPrice}");
        if (promo) expect(strayFullPrice(`${priced.title} ${priced.description}`), page.path).toBe(false);
      }
    }
  });

  test("the share card text never names a price (it's cached at the edge for a day)", () => {
    for (const page of indexablePages()) expect(JSON.stringify(page.card ?? {}), page.path).not.toMatch(/£\d/);
  });

  test("the kit Offer is what Checkout charges", () => {
    const kitOffer = (promo: boolean) => launchLoopApp(BASE, promo).offers.find((o) => o.name === "Launch Kit (one-off)");
    expect(kitOffer(true)?.price).toBe("14.00");
    expect(kitOffer(false)?.price).toBe("19.00");
    expect(JSON.stringify(siteGraph(BASE, true))).toContain(PROMO);
    expect(JSON.stringify(siteGraph(BASE, false))).not.toContain("£14");
  });

  test("kitPricePlain", () => {
    expect(kitPricePlain(true)).toBe(PROMO);
    expect(kitPricePlain(false)).toBe("£19");
  });
});

/**
 * Crawler- and visitor-facing source that may still spell out £19: the price itself, the Ship Loop credit,
 * and the paid-kit emails (a receipt for a kit bought at full price). Anything else goes through
 * KIT_PRICE_TOKEN or <KitPrice> so it follows the launch promo.
 */
const ALLOWED_LITERAL = new Set(["src/lib/products.ts", "src/emails/kit-failed.tsx", "src/emails/kit-ready.tsx"]);

test("no other hardcoded £19 in user- or crawler-facing source", () => {
  const root = path.resolve(__dirname, "../..");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? files(full) : /\.(tsx?|txt|xml|json)$/.test(name) ? [full] : [];
    });
  const offenders = files(path.join(root, "src"))
    .map((file) => path.relative(root, file))
    .filter((file) => !ALLOWED_LITERAL.has(file))
    .filter((file) => {
      // Comments and the price-parsing helpers' examples aren't shown to anyone.
      const code = readFileSync(path.join(root, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      return code.includes("£19");
    });
  expect(offenders).toEqual([]);
});
