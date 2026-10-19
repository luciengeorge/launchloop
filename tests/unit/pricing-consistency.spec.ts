import { expect, test } from "@playwright/test";
import { llmsText } from "@/lib/llms";
import { cardPages, indexablePages } from "@/lib/pages";
import { LAUNCH_PROMO, PRODUCTS, chargedPence } from "@/lib/products";
import { FAQ, SITE, kitPriceLabel } from "@/lib/site";
import { launchLoopApp, offerPrice, shipLoopApp, siteGraph } from "@/lib/structured-data";
import { OG_FAQ, TAGLINE_FAQ } from "@/lib/tools";

const BASE = "https://launchloop.dev";
/** Ship Loop is a free waitlist only: no price, no paid plans and no pre-order, anywhere. */
const STALE = /£99|£12|pre-?order|\/month|\/year|subscription for after launch/i;
const DASHES = /[\u2013\u2014]/;

test("the price labels match the amounts Checkout charges", () => {
  expect(PRODUCTS.kit.priceLabel).toBe(`£${PRODUCTS.kit.amountPence / 100}`);
  expect(LAUNCH_PROMO.priceLabel).toBe(`£${chargedPence("kit", true) / 100}`);
});

for (const promo of [false, true]) {
  test(`promo ${promo ? "on" : "off"}: the kit Offer is what Checkout charges, and Ship Loop has no Offer`, () => {
    const offers = launchLoopApp(BASE, promo).offers;
    expect(offers.map((o) => [o.name, o.price, o.priceCurrency, o.availability])).toEqual([
      ["Free preview", "0", "GBP", "https://schema.org/InStock"],
      ["Launch Kit (one-off)", offerPrice(chargedPence("kit", promo)), "GBP", "https://schema.org/InStock"],
    ]);
    expect(offers[1].price).toBe(((promo ? PRODUCTS.kit.amountPence - LAUNCH_PROMO.amountOffPence : PRODUCTS.kit.amountPence) / 100).toFixed(2));
    expect(siteGraph(BASE, promo)["@graph"]).toContainEqual(launchLoopApp(BASE, promo));
    expect(shipLoopApp(BASE)).not.toHaveProperty("offers");
    expect(JSON.stringify(siteGraph(BASE, promo))).not.toMatch(STALE);
  });

  test(`promo ${promo ? "on" : "off"}: llms.txt and llms-full.txt state the kit price from the config, and no Ship Loop price`, () => {
    for (const full of [false, true]) {
      const text = llmsText(BASE, full, promo);
      expect(text).not.toMatch(STALE);
      expect(text).not.toMatch(DASHES);
      expect(text).toContain(`## What the Launch Kit contains (${kitPriceLabel(promo)}, one-off)`);
      expect(text).toContain(`- Launch Kit: ${kitPriceLabel(promo)}`);
      expect(text).toContain("a free waitlist only, with nothing to buy");
      if (promo) expect(text).toContain(`full price ${PRODUCTS.kit.priceLabel}; ${LAUNCH_PROMO.code} is applied at checkout`);
      else expect(text).not.toContain(LAUNCH_PROMO.code);
    }
  });
}

test("static copy that can't follow the promo flag names no price: meta tags, share cards, SITE and FAQ answers", () => {
  const strings = [
    SITE.description,
    ...indexablePages().flatMap((p) => [p.title, p.description]),
    ...cardPages().flatMap((p) => [p.card.eyebrow, p.card.headline]),
    ...[...FAQ, ...TAGLINE_FAQ, ...OG_FAQ].flatMap((item) => [item.q, item.a]),
  ];
  for (const s of strings) {
    expect(s, s).not.toMatch(/£/);
    expect(s, s).not.toMatch(STALE);
    expect(s, s).not.toMatch(DASHES);
  }
});
