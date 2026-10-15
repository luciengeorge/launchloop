import { expect, test, type BrowserContext, type Page, type Request } from "@playwright/test";
import { logIn, magicLinkFor, makeSampleKit, uniqueEmail } from "./helpers";

type Variant = "control" | "treatment";

/** Answers PostHog's flags request for this page or context, like a flag rolled out to one variant. */
async function forceFlags(target: Page | BrowserContext, flags: Record<string, Variant>) {
  const details = Object.fromEntries(Object.entries(flags).map(([key, variant]) => [key, { key, enabled: true, variant, reason: null, metadata: {} }]));
  await target.route(/\/lp-relay\/flags/, (route) => route.fulfill({ json: { flags: details, errorsWhileComputingFlags: false } }));
}

const checkoutBody = (req: Request) => req.postDataJSON() as { product: string; analyticsId?: string; experiments: Record<string, string> };
const isCheckout = (req: Request) => req.method() === "POST" && new URL(req.url()).pathname === "/api/checkout";

async function payKit(page: Page, kitId: string, price: string) {
  await page.getByRole("button", { name: `Unlock the full kit, ${price}` }).click();
  await page.waitForURL(/\/checkout\/mock\?product=kit/);
  await page.getByRole("button", { name: `Pay ${price} (test mode)` }).click();
  await page.waitForURL(new RegExp(`/account/kits/${kitId}\\?paid=1&aid=`));
}

test("promo control: plain £19, no code on checkout, variant recorded", async ({ page }) => {
  await logIn(page, uniqueEmail("promo-control"));
  const kitId = await makeSampleKit(page);
  await expect(page.getByTestId("kit-price")).toContainText("£19");
  await expect(page.getByTestId("kit-price").locator("s")).toHaveCount(0);
  await expect(page.getByTestId("launch-promo")).toHaveCount(0);

  const checkout = page.waitForRequest(isCheckout);
  await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
  expect(checkoutBody(await checkout).experiments).toEqual({ exp_launch14_promo: "control" });
  await page.waitForURL(/\/checkout\/mock\?product=kit/);
  expect(new URL(page.url()).searchParams.get("promo")).toBeNull();
  expect(new URL(page.url()).searchParams.get("kitId")).toBe(kitId);
  await expect(page.getByTestId("mock-promo")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pay £19 (test mode)" })).toBeVisible();
});

test("promo treatment: £19 struck through, £14 with LAUNCH14, kept through the magic link on another device", async ({ page, browser }) => {
  await forceFlags(page, { exp_launch14_promo: "treatment" });
  const kitId = await makeSampleKit(page);
  const price = page.getByTestId("kit-price");
  await expect(price.locator("s")).toHaveText("Was £19");
  await expect(price).toContainText("£14");
  await expect(page.getByTestId("launch-promo")).toContainText("LAUNCH14 takes £5 off");

  const email = uniqueEmail("promo-treatment");
  await page.getByRole("button", { name: "Unlock the full kit, £14" }).click();
  await page.getByLabel("Your email").fill(email);
  const authRequest = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/auth/request");
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  const aid = (await authRequest).postDataJSON().intent.aid as string;
  expect(aid).toBeTruthy();
  await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "sent");

  // The link comes back with the first page's anonymous id, so PostHog keeps the same variant.
  const other = await browser.newContext();
  await forceFlags(other, { exp_launch14_promo: "treatment" });
  const phone = await other.newPage();
  const checkout = phone.waitForRequest(isCheckout);
  await phone.goto(await magicLinkFor(page.request, email));
  const body = checkoutBody(await checkout);
  expect(body.analyticsId).toBe(aid);
  expect(body.experiments).toEqual({ exp_launch14_promo: "treatment" });

  await phone.waitForURL(/\/checkout\/mock\?product=kit/);
  expect(new URL(phone.url()).searchParams.get("promo")).toBe("LAUNCH14");
  await expect(phone.getByTestId("mock-promo")).toHaveText("LAUNCH14 applied");
  await phone.getByRole("button", { name: "Pay £14 (test mode)" }).click();
  await phone.waitForURL(new RegExp(`/account/kits/${kitId}\\?paid=1&aid=${aid}$`));
  await other.close();
});

test("Ship Loop upsell control: the success page is unchanged", async ({ page }) => {
  await logIn(page, uniqueEmail("upsell-control"));
  const kitId = await makeSampleKit(page);
  await payKit(page, kitId, "£19");
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("ship-loop-upsell")).toHaveCount(0);
});

test("Ship Loop upsell treatment: soft £99/year offer after paying, only on the success page", async ({ page }) => {
  await forceFlags(page, { exp_shiploop_success_upsell: "treatment" });
  await logIn(page, uniqueEmail("upsell-treatment"));
  const kitId = await makeSampleKit(page);
  await payKit(page, kitId, "£19");

  const upsell = page.getByTestId("ship-loop-upsell");
  await expect(upsell.getByRole("heading")).toHaveText("You're in. Your kit is on its way to your inbox.");
  await expect(upsell).toContainText("Ship Loop is the weekly accountability loop for getting your launch out the door.");
  await expect(upsell).toContainText("Founding price: £99/year.");
  await expect(upsell).toContainText("auto-refunded in full if Ship Loop is not live within 12 months of the pre-order");
  await expect(upsell).not.toContainText(/for life/i);
  await expect(upsell.getByRole("link", { name: "Not yet? Join the free waitlist" })).toHaveAttribute("href", "/ship-loop#waitlist");

  // Not on a later visit to the same kit.
  await page.goto(`/account/kits/${kitId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("ship-loop-upsell")).toHaveCount(0);
  await page.goBack();

  const checkout = page.waitForRequest(isCheckout);
  await page.getByRole("button", { name: "Pre-order Ship Loop, £99/yr" }).click();
  const body = checkoutBody(await checkout);
  expect(body.product).toBe("shiploop_yearly");
  expect(body.experiments).toEqual({ exp_shiploop_success_upsell: "treatment" });
  await page.waitForURL(/\/checkout\/mock\?product=shiploop_yearly/);
  await expect(page.getByRole("button", { name: "Pay £99 (test mode)" })).toBeVisible();
});
