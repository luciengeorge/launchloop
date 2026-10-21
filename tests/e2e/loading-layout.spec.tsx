import { expect, test, type Page } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { KitSkeleton } from "@/components/kit/kit-skeleton";
import { UnlockPanel, UnlockPanelPlaceholder } from "@/components/kit/unlock-panel";
import { makeSampleKit } from "./helpers";

/** Puts panel markup into the paywall's real panel column (real width and CSS) and returns the unlock button's offset from the column's top. */
async function unlockButtonOffset(page: Page, html: string) {
  return page.getByTestId("preview-paywall").evaluate((paywall, markup) => {
    const column = paywall.lastElementChild as HTMLElement;
    column.innerHTML = markup;
    const button = [...column.querySelectorAll("button")].find((b) => b.textContent!.includes("Unlock the full kit"))!;
    return button.getBoundingClientRect().top - column.getBoundingClientRect().top;
  }, html);
}

// The e2e server answers the promo at once, so the placeholder never shows on its own here: both versions go into the live page instead.
test("while the price loads, the unlock button already sits where the full-price panel puts it", async ({ page }) => {
  await makeSampleKit(page);
  await expect(page.getByTestId("unlock-panel")).toBeVisible();
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const email of [undefined, "maker@example.com"]) {
      for (const cancelled of [false, true]) {
        const props = { email, autoCheckout: false, cancelled, saved: true };
        const panel = await unlockButtonOffset(page, renderToStaticMarkup(<UnlockPanel kitId="kit_0123456789abcdef" priceLabel="£19" launchPromo={{ variant: "control" }} {...props} />));
        const placeholder = await unlockButtonOffset(page, renderToStaticMarkup(<UnlockPanelPlaceholder {...props} />));
        expect(Math.abs(placeholder - panel), `${width}px wide, ${email ? "signed in" : "signed out"}, cancelled: ${cancelled}`).toBeLessThanOrEqual(1);
      }
    }
  }
});

test("the footer stays hidden while a page skeleton is up, so it can't be scrolled into view and then jump", async ({ page }) => {
  await page.goto("/pricing");
  const footer = page.locator("footer");
  await expect(footer).toBeVisible();
  await page.locator("main").evaluate((main, html) => main.insertAdjacentHTML("afterbegin", `<div id="skeleton">${html}</div>`), renderToStaticMarkup(<KitSkeleton />));
  await expect(footer).toHaveCSS("visibility", "hidden");
  await page.locator("#skeleton").evaluate((el) => el.remove());
  await expect(footer).toBeVisible();
});
