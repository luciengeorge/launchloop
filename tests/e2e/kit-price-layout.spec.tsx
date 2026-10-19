import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { PricedText } from "@/components/kit-price";
import { FAQ, KIT_PRICE_TOKEN } from "@/lib/site";

const PRICED_QUESTION = FAQ.find((item) => item.q.includes(KIT_PRICE_TOKEN))!.q;

// The e2e server always runs with the promo off, so this swaps the promo markup into the real accordion trigger (real CSS, flex).
test("the home FAQ keeps the space before 'was £19 now £14' at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /^What do I get for/ });
  await expect(trigger).toBeVisible();
  await trigger.locator(":scope > span").first().evaluate((el, html) => {
    el.outerHTML = html;
  }, renderToStaticMarkup(<PricedText text={PRICED_QUESTION} promo />));

  await expect(trigger.locator("s")).toHaveText(/£19/);
  // Distance from the end of "for" to the struck-through £19: a space, not 0px.
  const gap = await trigger.evaluate((el) => {
    const struck = el.querySelector("s")!;
    const before = struck.closest("[data-testid=kit-price-promo]")!.previousSibling!;
    const range = document.createRange();
    range.setStart(before, 0);
    range.setEnd(before, before.textContent!.trimEnd().length);
    const word = [...range.getClientRects()].at(-1)!;
    const price = struck.getBoundingClientRect();
    // Wrapped onto the next line: the space became the line break.
    if (price.top >= word.bottom - 1) return Infinity;
    return price.left - word.right;
  });
  expect(gap).toBeGreaterThan(2);
});
