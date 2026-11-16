import { expect, test } from "@playwright/test";
import { PRODUCTS } from "../../src/lib/products";

// Runs on the priced build only (priced-desktop in playwright.config.ts): STRIPE_DIRECTORY_PACK_PRICE_ID is set there.

test("priced: the header CTA is the pack's, linking /directory-pack, instead of the kit's", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  const cta = header.getByTestId("nav-pack-cta");
  await expect(cta).toBeVisible();
  await expect(cta).toHaveText("Get the directory pack");
  await expect(cta).toHaveAttribute("href", "/directory-pack");
  await expect(header.getByRole("link", { name: /launch kit/ })).toHaveCount(0);

  await cta.click();
  await expect(page).toHaveURL(/\/directory-pack$/);
  await expect(page.getByTestId("pack-offer")).toContainText(`${PRODUCTS.directoryPack.priceLabel} once`);
  await expect(page.getByRole("button", { name: `Buy the pack, ${PRODUCTS.directoryPack.priceLabel}` })).toBeVisible();
});
