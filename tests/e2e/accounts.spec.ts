import { expect, test } from "@playwright/test";
import { logIn, magicLinkFor, makeSampleKit, uniqueEmail, unlockAndPay } from "./helpers";

test("magic-link login, single-use token, header state and log out", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(banner.getByRole("link", { name: "Get my launch kit" })).toBeVisible();
  await expect(banner.getByRole("link", { name: "What you get" })).toBeVisible();
  await expect(banner.getByRole("link", { name: "Pricing" })).toBeVisible();
  await expect(banner.getByRole("link", { name: "Ship Loop" })).toBeVisible();
  await expect(banner.getByRole("link", { name: "FAQ" })).toBeVisible();

  const email = uniqueEmail("login");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a login link" }).click();
  const link = await magicLinkFor(page.request, email);

  // A scanner-style GET (no JS, no POST) does not consume it.
  const scan = await page.request.get(link);
  expect(scan.ok()).toBe(true);
  // A real browser auto-submits with no confirm click.
  await page.goto(link);
  await page.waitForURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "My kits" })).toBeVisible();
  await expect(page.getByText("No kits yet.")).toBeVisible();
  // Logged-in navbar: My kits + Log out, no primary CTA, site header still present
  await expect(banner.getByRole("link", { name: "My kits" })).toBeVisible();
  await expect(banner.getByRole("button", { name: "Log out" })).toBeVisible();
  await expect(banner.getByRole("link", { name: "Get my launch kit" })).toHaveCount(0);
  await expect(banner.getByRole("link", { name: "LaunchLoop home" })).toBeVisible();
  await expect(banner.getByRole("link", { name: "Pricing" })).toBeVisible();

  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "ll_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");

  // Reusing the same link fails.
  await page.goto(link);
  await page.waitForURL(/\/login\?error=expired/);
  await expect(page.getByText("That login link has expired")).toBeVisible();

  // Log out from the navbar (not only /account).
  await page.goto("/account");
  await expect(page.getByRole("banner").getByRole("link", { name: "LaunchLoop home" })).toBeVisible();
  await page.getByRole("banner").getByRole("button", { name: "Log out" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Log in" })).toBeVisible();
  await page.goto("/account");
  await page.waitForURL(/\/login\?next=%2Faccount|\/login\?next=\/account/);
});

test("tampered tokens and forged session cookies are rejected", async ({ page, context, baseURL }) => {
  await page.goto("/login/verify?token=abc.def");
  await page.waitForURL(/\/login\?error=expired/);

  const forged = Buffer.from(JSON.stringify({ email: "victim@example.com", exp: Date.now() + 1e9 })).toString("base64url");
  await context.addCookies([{ name: "ll_session", value: `${forged}.bogus`, url: baseURL! }]);
  await page.goto("/account");
  await page.waitForURL(/\/login/);
});

test("magic-link requests are rate limited per email", async ({ request }) => {
  const email = uniqueEmail("ratelimit");
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) statuses.push((await request.post("/api/auth/request", { data: { email } })).status());
  expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
  expect(statuses[5]).toBe(429);
  expect((await request.post("/api/auth/request", { data: { email: "not-an-email" } })).status()).toBe(400);
});

test("anonymous kits made in this browser are claimed on login and shown on the dashboard", async ({ page }) => {
  const kitId = await makeSampleKit(page);

  const email = uniqueEmail("claim");
  await logIn(page, email);

  const row = page.locator(`[data-testid="account-kit"][data-kit-id="${kitId}"]`);
  await expect(row).toBeVisible();
  await expect(row.getByRole("heading", { name: "Snapshelf" })).toBeVisible();
  await expect(row.getByTestId("kit-status")).toHaveText("Preview");
  await expect(row.locator("time")).toBeVisible();
  await row.getByRole("link", { name: "Unlock kit" }).click();
  await page.waitForURL(new RegExp(`/account/kits/${kitId}$`));
  await expect(page.getByTestId("unlock-panel")).toBeVisible();

  // A different account logging in from a fresh browser can't claim it.
  const other = await page.context().browser()!.newContext();
  const otherPage = await other.newPage();
  await logIn(otherPage, uniqueEmail("other"));
  await expect(otherPage.locator(`[data-kit-id="${kitId}"]`)).toHaveCount(0);
  await other.close();

  // Kits made while logged in are linked straight away.
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  const secondId = new URL(page.url()).pathname.split("/").pop()!;
  await page.goto("/account");
  await expect(page.getByTestId("account-kit")).toHaveCount(2);
  await expect(page.locator(`[data-kit-id="${secondId}"]`)).toBeVisible();
});

test("kits paid for with an email show up for that account with downloads and billing", async ({ browser }) => {
  const buyer = await browser.newContext();
  const page = await buyer.newPage();
  const kitId = await makeSampleKit(page);
  const email = uniqueEmail("buyer");
  await unlockAndPay(page, kitId, email);
  await expect(page.getByRole("heading", { name: "Your launch kit is ready" })).toBeVisible();
  await buyer.close();

  // A fresh browser (no anonymous-kit cookie): the payment linked it to the account.
  const fresh = await browser.newContext();
  const p2 = await fresh.newPage();
  await logIn(p2, email);
  const row = p2.locator(`[data-kit-id="${kitId}"]`);
  await expect(row.getByTestId("kit-status")).toHaveText("Paid");
  await expect(row.getByTestId("kit-progress")).toContainText("0%");
  const zipHref = await row.getByRole("link", { name: "Download ZIP" }).getAttribute("href");
  const zip = await p2.request.get(zipHref!);
  expect(zip.status()).toBe(200);
  expect(zip.headers()["content-type"]).toBe("application/zip");
  for (const file of ["og-1200x630.png", "x-1600x900.png", "product-hunt-gallery-1270x760.png"]) {
    const res = await p2.request.get((await row.getByRole("link", { name: file }).getAttribute("href"))!);
    expect(res.headers()["content-type"]).toBe("image/png");
  }
  // One-off kit buyers get Manage billing too (mock Stripe → billing=mock).
  await expect(p2.getByTestId("billing-card")).toBeVisible();
  await p2.getByRole("button", { name: "Manage billing" }).click();
  await p2.waitForURL(/\/account\?billing=mock/);
  await expect(p2.getByText("unavailable in test mode")).toBeVisible();
  await fresh.close();
});

test("Ship Loop subscribers get a Manage billing button", async ({ page }) => {
  const email = uniqueEmail("shiploop");
  await page.goto("/checkout/mock?product=shiploop_monthly");
  await page.getByLabel("Email for your receipt and kit").fill(email);
  await page.getByRole("button", { name: /Pay/ }).click();
  await page.waitForURL(/\/ship-loop\/thanks/);

  await logIn(page, email);
  await page.getByRole("button", { name: "Manage billing" }).click();
  await page.waitForURL(/\/account\?billing=mock/);
  await expect(page.getByText("unavailable in test mode")).toBeVisible();
});

test("private pages are noindex and disallowed in robots.txt", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /account");
  for (const path of ["/login", "/login/check-email", "/account"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});
