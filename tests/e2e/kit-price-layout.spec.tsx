import { expect, test, type Locator } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { PricedText } from "@/components/kit-price";
import { FAQ, KIT_PRICE_TOKEN } from "@/lib/site";

const PRICED_QUESTION = FAQ.find((item) => item.q.includes(KIT_PRICE_TOKEN))!.q;

/** Pixels from the end of the word before the struck-through price to the price: about a space, or 0 when it's lost. */
function gapBeforeStruckPrice(trigger: Locator) {
  return trigger.evaluate((el) => {
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
}

// The e2e server always runs with the promo off, so this puts the promo markup into the real accordion trigger (real CSS, flex).
test("the home FAQ keeps the space before 'was £19 now £14' at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /^What do I get for/ });
  await expect(trigger).toBeVisible();
  await trigger.getByTestId("faq-question").evaluate((el, html) => {
    el.innerHTML = html;
  }, renderToStaticMarkup(<PricedText text={PRICED_QUESTION} promo />));
  await expect(trigger.locator("s")).toHaveText(/£19/);
  expect(await gapBeforeStruckPrice(trigger)).toBeGreaterThan(2);
  // The question text and the price are one flex item, not several.
  expect(await trigger.evaluate((el) => [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()).length)).toBe(0);
});
