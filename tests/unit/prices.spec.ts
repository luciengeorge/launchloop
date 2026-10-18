import { expect, test } from "@playwright/test";
import { parse } from "node-html-parser";
import { spacedText } from "../../src/lib/ingest/text";
import { pricesIn, pricingProofPoint } from "../../src/lib/prices";

/** launchloop.dev's home pricing strip (React leaves no whitespace between elements): the kit card's CTA ends "£19" right before the "3. Ship Loop" card. */
const LAUNCHLOOP_PRICING = [
  `<section id="pricing"><h2>Three steps. Pay only for what you need.</h2>`,
  `<article><div><h3>1. Free preview</h3></div><p><span>£0</span></p><p>Try it on your repo.</p><div><a href="/#start">Get my free preview</a></div></article>`,
  `<article><div><h3>2. Launch Kit</h3><span>Most people start here</span></div><p><span>£19</span><span>once</span></p><p>3 images with no watermark.</p><div><a href="/?plan=kit#start">Get my launch kit, £19</a></div></article>`,
  `<article><div><h3>3. Ship Loop</h3><span>Coming soon</span></div><p><span>from £12</span><span>/month</span></p><p>Subscribe within 14 days and we credit your £19.</p></article></section>`,
].join("");

test("adjacent elements don't glue digits onto a price: no more '£19, £193, £12/mo'", () => {
  const section = parse(LAUNCHLOOP_PRICING);
  // What the scraper used to read.
  expect(section.text).toContain("£193. Ship Loop");
  expect(pricesIn(spacedText(section))).toEqual(["£0", "£19", "£12/mo"]);
  expect(pricingProofPoint(pricesIn(spacedText(section)))).toBe("Pricing on site: free plan, £12/mo, £19");
});

test("umami: '$0/ mo, $20/ mo, $0.00, $200/ mo' is normalised and deduped", () => {
  const prices = pricesIn("$0/ mo, $20/ mo, $0.00, $200/ mo");
  expect(prices).toEqual(["$0/mo", "$20/mo", "$200/mo"]);
  expect(pricingProofPoint(prices)).toBe("Pricing on site: free plan, $20/mo, $200/mo");
});

test("currency and period stay together; partial and implausible numbers are dropped; the count is capped", () => {
  expect(pricesIn("Pro $200 / month, billed $200/mo, or €9.50/ year")).toEqual(["$200/mo", "€9.50/yr"]);
  expect(pricesIn("Team $1,200/yr")).toEqual(["$1,200/yr"]);
  expect(pricesIn("£9.99 then £9.99/mo, £19.00")).toEqual(["£9.99/mo", "£19"]);
  expect(pricesIn("v£19.995 US$5 £19.99.1")).toEqual([]);
  expect(pricesIn("Enterprise $250000/yr, Hobby $5/mo")).toEqual(["$5/mo"]);
  expect(pricesIn("$1 $2 $3 $4 $5 $6")).toEqual(["$1", "$2", "$3", "$4"]);
});

test("the pricing proof point is short and clean, or dropped when it's noise", () => {
  expect(pricingProofPoint(["$6/mo"])).toBe("Pricing on site: $6/mo");
  expect(pricingProofPoint(["$0"])).toBe("Pricing on site: free plan");
  expect(pricingProofPoint(["$49/mo", "$9/mo", "$0", "$19/mo", "$99/mo"])).toBe("Pricing on site: free plan, from $9/mo");
  expect(pricingProofPoint(["$10/mo", "€9/mo", "£8/mo"])).toBeUndefined();
  expect(pricingProofPoint([])).toBeUndefined();
});
