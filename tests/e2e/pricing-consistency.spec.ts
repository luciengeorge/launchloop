import { expect, test } from "@playwright/test";
import { PRODUCTS, chargedPence } from "../../src/lib/products";
import { offerPrice } from "../../src/lib/structured-data";

/** Ship Loop is a free waitlist only: no £99 pre-order, no paid plan, no pre-order wording. */
const STALE = /£99|pre-?order/i;

type Offer = { "@type": string; name?: string; price: string; priceCurrency: string; availability: string };

/** Every Offer in a page's JSON-LD, wherever it is nested. */
function offersIn(node: unknown, found: Offer[] = []): Offer[] {
  if (Array.isArray(node)) node.forEach((n) => offersIn(n, found));
  else if (node && typeof node === "object") {
    if ((node as { "@type"?: string })["@type"] === "Offer") found.push(node as Offer);
    Object.values(node).forEach((v) => offersIn(v, found));
  }
  return found;
}

test("no rendered page, JSON-LD block or llms.txt mentions £99 or a pre-order, and every Offer matches the pricing config", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const paths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  expect(paths.length).toBeGreaterThan(10);

  // The e2e build has the launch promo off: the kit is at its list price.
  const kitPrice = offerPrice(chargedPence("kit", false));
  let kitOffers = 0;
  for (const path of [...paths, "/llms.txt", "/llms-full.txt"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    const body = await res.text();
    expect(body, path).not.toMatch(STALE);
    if (path.endsWith(".txt")) {
      expect(body, path).toContain(`Launch Kit: ${PRODUCTS.kit.priceLabel} once`);
      continue;
    }

    const blocks = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    for (const offer of offersIn(blocks)) {
      expect(offer, path).toMatchObject({ priceCurrency: "GBP", availability: "https://schema.org/InStock" });
      if (offer.name === "Launch Kit (one-off)") {
        expect(offer.price, path).toBe(kitPrice);
        kitOffers++;
      } else {
        expect(offer.price, `${path} ${offer.name ?? "free tool"}`).toBe("0");
      }
    }
    if (path === "/ship-loop") expect(offersIn(blocks), path).toEqual([]);
  }
  // The home and pricing pages carry the kit Offer.
  expect(kitOffers).toBe(2);
});

test("pricing, Ship Loop and FAQ copy show the kit at the config price and Ship Loop as a free waitlist with no price", async ({ page }) => {
  for (const path of ["/", "/pricing", "/ship-loop", "/faq"]) {
    await page.goto(path);
    const main = page.locator("main");
    await expect(main, path).toContainText(PRODUCTS.kit.priceLabel);
    await expect(main, path).not.toContainText(/£99|£12|pre-?order|planned pricing|\/month|\/year/i);
  }
});
