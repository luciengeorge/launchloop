import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { PackOffer } from "@/components/directory-pack/pack-offer";
import { PRODUCTS } from "@/lib/products";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const buttons = (html: string) => (html.match(/<button[^>]*>.*?<\/button>/g) ?? []).map(text).map((b) => b.trim());

for (const source of ["directory_pack_page", "free_directories_page"] as const) {
  test(`${source}, price not set: Coming soon and the pack waitlist, with no price and nothing to buy`, () => {
    const html = renderToStaticMarkup(<PackOffer offer={null} source={source} />);
    expect(text(html)).toContain("Coming soon");
    expect(html).toContain('data-testid="waitlist-form"');
    expect(html).toContain(`name="source" value="${source}"`);
    expect(html).toContain('aria-label="Join the Directory Launch Pack waitlist"');
    expect(html).not.toContain("£");
    expect(html).not.toContain(PRODUCTS.directoryPack.priceLabel);
    expect(html).not.toMatch(/buy/i);
    expect(buttons(html)).toEqual(["Join the waitlist"]);
  });
}

test("price set: the price from config and a Buy button, and no waitlist", () => {
  const html = renderToStaticMarkup(<PackOffer offer={{ priceLabel: PRODUCTS.directoryPack.priceLabel }} source="directory_pack_page" />);
  expect(text(html)).toContain(`${PRODUCTS.directoryPack.priceLabel} once`);
  expect(buttons(html)).toEqual([`Buy the pack, ${PRODUCTS.directoryPack.priceLabel}`]);
  expect(html).not.toContain('data-testid="waitlist-form"');
  expect(text(html)).not.toContain("Coming soon");
});

test("the pack's price lives in config and matches what Checkout charges", () => {
  expect(PRODUCTS.directoryPack.priceLabel).toBe(`£${PRODUCTS.directoryPack.amountPence / 100}`);
});
