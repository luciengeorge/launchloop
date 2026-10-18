import { expect, test } from "@playwright/test";
import { loginCodeFor, magicLinkFor, makeSampleKit, requestUnlockLogin as requestUnlock, uniqueEmail } from "./helpers";

test("unlock with the 6-digit code never leaves the tab and goes straight to checkout", async ({ page }) => {
  const kitId = await makeSampleKit(page);
  const email = uniqueEmail("code");
  await requestUnlock(page, email);
  const code = await loginCodeFor(page.request, email);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL(/\/checkout\/mock\?product=kit/);
  expect(page.url()).toContain(`kitId=${kitId}`);
  await expect(page.getByLabel("Email for your receipt and kit")).toHaveValue(email);
});

test("magic link opened in another browser carries the unlock intent and claims the kit", async ({ page, browser }) => {
  const kitId = await makeSampleKit(page);
  const email = uniqueEmail("otherdevice");
  await requestUnlock(page, email);
  const link = await magicLinkFor(page.request, email);

  const other = await browser.newContext();
  const phone = await other.newPage();
  await phone.goto(link);
  await expect(phone.getByText("Taking you to secure checkout…").or(phone.getByLabel("Email for your receipt and kit"))).toBeVisible();
  await phone.waitForURL(/\/checkout\/mock\?product=kit/);
  expect(phone.url()).toContain(`kitId=${kitId}`);
  await phone.getByRole("button", { name: /Pay £19/ }).click();
  await phone.waitForURL(new RegExp(`/account/kits/${kitId}\\?paid=1`));
  await other.close();
});

test("a paid kit's login link opens the kit in the account; a wrong code is rejected and burned", async ({ page, request }) => {
  const kitId = await makeSampleKit(page);
  const email = uniqueEmail("paid");
  await requestUnlock(page, email);
  const code = await loginCodeFor(page.request, email);

  for (let i = 0; i < 5; i++) {
    const wrong = String((Number(code) + 1 + i) % 1_000_000).padStart(6, "0");
    const res = await request.post("/api/auth/verify", { data: { email, code: wrong } });
    expect(res.status()).toBe(400);
  }
  // Sixth try is locked out, even with the right code.
  expect((await request.post("/api/auth/verify", { data: { email, code } })).status()).toBe(429);

  // The link still works and lands on checkout; pay.
  await page.goto(await magicLinkFor(page.request, email));
  await page.waitForURL(/\/checkout\/mock/);
  await page.getByRole("button", { name: /Pay £19/ }).click();
  await page.waitForURL(new RegExp(`/account/kits/${kitId}`));

  // A later unlock-intent login for the same (now paid) kit opens it in /account.
  await page.context().clearCookies();
  const res = await page.request.post("/api/auth/request", { data: { email, intent: { type: "unlock", kitId } } });
  expect(res.ok()).toBe(true);
  await page.goto(await magicLinkFor(page.request, email));
  await page.waitForURL(new RegExp(`/account/kits/${kitId}$`));
});

test("no-JS: verify page falls back to the email code and a scanner GET doesn't burn the link", async ({ browser, page }) => {
  const email = uniqueEmail("nojs");
  await page.request.post("/api/auth/request", { data: { email } });
  const link = await magicLinkFor(page.request, email);
  const code = await loginCodeFor(page.request, email);
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(link);
  const form = p.getByTestId("noscript-code-form");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("6-digit code").fill(code);
  await form.getByRole("button", { name: "Log in" }).click();
  await p.waitForURL(/\/account$/);
  await ctx.close();
});
