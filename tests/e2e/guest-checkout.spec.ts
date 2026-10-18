import { expect, test, type Request } from "@playwright/test";
import { magicLinkFor, makeSampleKit, uniqueEmail } from "./helpers";

// Its own client IP, so these previews and guest checkouts don't spend the rest of the suite's per-IP budgets.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.28" } });

const isCheckout = (req: Request) => req.method() === "POST" && new URL(req.url()).pathname === "/api/checkout";
const STRIPE_URL = "https://checkout.stripe.com/c/pay/cs_test_e2e_guest";

test("signed out: Unlock creates a checkout session with no login and no email, and redirects to checkout", async ({ page }) => {
  const kitId = await makeSampleKit(page);
  const panel = page.getByTestId("unlock-panel");
  await expect(panel).toContainText("Pay securely with Stripe, no account needed");
  await expect(panel).toContainText("Log in with the same email to find it in My kits");

  const response = page.waitForResponse((r) => isCheckout(r.request()));
  await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
  const res = await response;
  expect(res.status()).toBe(200);
  const body = res.request().postDataJSON() as Record<string, unknown>;
  expect(body).toMatchObject({ product: "kit", kitId });
  expect(body.email).toBeUndefined();

  // Test mode's stand-in for Stripe Checkout, which collects the email itself.
  await page.waitForURL((u) => u.pathname === "/checkout/mock");
  const params = new URL(page.url()).searchParams;
  expect(params.get("kitId")).toBe(kitId);
  expect(params.get("email")).toBeNull();
  await expect(page.getByLabel("Email for your receipt and kit")).toHaveValue("");
});

test("signed out: the paywall hands the browser to the Stripe Checkout URL the server returns", async ({ page }) => {
  await makeSampleKit(page);
  // The server's real answer for a guest is checked, then swapped for a Stripe URL; Stripe itself is stubbed, so nothing reaches it.
  let serverAnswer: { status: number; url?: string } | undefined;
  await page.route("**/api/checkout", async (route) => {
    const real = await route.fetch();
    serverAnswer = { status: real.status(), url: ((await real.json()) as { url?: string }).url };
    await route.fulfill({ json: { url: STRIPE_URL, promo: "none" } });
  });
  await page.route("https://checkout.stripe.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<title>Stripe Checkout (stub)</title>" }));

  await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
  await page.waitForURL(STRIPE_URL);
  expect(serverAnswer).toMatchObject({ status: 200, url: expect.stringMatching(/^\/checkout\/mock\?product=kit&/) });
});

test("guest success page: kit is ready, log in with the same email; the prefilled magic link claims it into My kits", async ({ page, browser }) => {
  const kitId = await makeSampleKit(page);
  await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
  await page.waitForURL(/\/checkout\/mock/);
  const email = uniqueEmail("guest");
  await page.getByLabel("Email for your receipt and kit").fill(email);
  await page.getByRole("button", { name: "Pay £19 (test mode)" }).click();
  await page.waitForURL(new RegExp(`/checkout/success\\?kit=${kitId}&session_id=mock_\\w+&aid=`));
  const successUrl = page.url();

  const success = page.getByTestId("guest-success");
  await expect(success).toContainText("Payment received");
  await expect(success.getByRole("heading", { level: 1 })).toHaveText("Your Snapshelf launch kit is ready");
  await expect(success.getByTestId("guest-success-login")).toHaveText(
    `Log in with ${email}, the email you paid with, to open it from My kits. We'll email you a magic link. No password needed.`,
  );
  await expect(success).toContainText(`A copy with the ZIP is on its way to ${email} too.`);
  await expect(success.getByLabel("Email")).toHaveValue(email);
  await expect(success.getByRole("link", { name: "Open the kit now with its private link" })).toHaveAttribute("href", `/kit/${kitId}`);

  // Without the matching Checkout session id, the page doesn't reveal the buyer's email.
  await page.goto(`/checkout/success?kit=${kitId}&session_id=cs_test_not_this_one`);
  await expect(success.getByTestId("guest-success-login")).toHaveText("Log in with the email you paid with to open it from My kits. We'll email you a magic link. No password needed.");
  await expect(success.getByLabel("Email")).toHaveValue("");
  await expect(success).not.toContainText(email);

  await page.goto(successUrl);
  await success.getByRole("button", { name: "Email me a login link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  // A fresh browser has no anonymous-kit cookie, so only the pending purchase can put the kit in this account.
  const other = await browser.newContext();
  const phone = await other.newPage();
  await phone.goto(await magicLinkFor(page.request, email));
  await phone.waitForURL(new RegExp(`/account/kits/${kitId}$`));
  await expect(phone.getByRole("heading", { level: 1, name: "Snapshelf" })).toBeVisible();
  await phone.goto("/account");
  await expect(phone.locator(`[data-testid="account-kit"][data-kit-id="${kitId}"]`).getByTestId("kit-status")).toHaveText(/^Paid/);
  await other.close();
});
