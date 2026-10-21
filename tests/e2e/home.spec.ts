import { expect, test } from "@playwright/test";
import { h1Tags, logIn, MAIN_H1_HEIGHTS, makeSampleKit, setHeroHeadline, uniqueEmail } from "./helpers";

test("home page explains the product and offers the input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Paste your repo");
  await expect(page.getByLabel("GitHub repo or live site URL")).toBeVisible();
  await expect(page.getByRole("button", { name: "Get my free preview" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Three steps. Pay only for what you need." })).toBeVisible();
  await expect(page.getByText("£19", { exact: true }).first()).toBeVisible();
});

test("HERO_EXPERIMENT unset (production): the home h1 is main's static h1, whatever PostHog says", async ({ page }) => {
  await setHeroHeadline(page.request, "test");
  try {
    const html = await (await page.request.get("/")).text();
    expect(html).toContain('<h1 class="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">Paste your repo. <span class="text-primary">Get your whole launch.</span></h1>');
    expect(html).not.toMatch(/data-hero|data-reserve|hero-failsafe/);
    expect(h1Tags(html)).toHaveLength(1);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paste your repo. Get your whole launch.");
  } finally {
    await setHeroHeadline(page.request, null);
  }
});

test("HERO_EXPERIMENT unset: the home h1 is main's height at each width", async ({ page, isMobile }) => {
  for (const { width, height } of MAIN_H1_HEIGHTS.filter((w) => w.mobile === isMobile)) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("load");
    expect((await page.getByRole("heading", { level: 1 }).boundingBox())!.height, `h1 height at ${width}px`).toBe(height);
  }
});

test("home header when signed out: Log in and Get my launch kit", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  await expect(banner.getByRole("link", { name: "Get my launch kit" })).toBeVisible();
  await expect(banner.getByRole("link", { name: "My kits" })).toHaveCount(0);
  await expect(banner.getByRole("button", { name: "Log out" })).toHaveCount(0);
});

test("phones: the home page doesn't scroll sideways, the header CTA fits and Log in stays on one line", async ({ page }) => {
  // The test build has the launch promo flag off, so this is the plain "Get my launch kit, £19" CTA.
  for (const width of [360, 375, 390, 400]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const cta = page.getByRole("banner").getByRole("link", { name: "Get my launch kit, £19" });
    await expect(cta).toBeVisible();
    const layout = await page.evaluate(() => {
      const login = document.querySelector("[data-testid=nav-login]")!;
      const text = document.createRange();
      text.selectNodeContents(login);
      const cta = document.querySelector("header a[data-plan=kit]")!.getBoundingClientRect();
      return { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, loginLines: text.getClientRects().length, ctaRight: cta.right, ctaHeight: cta.height };
    });
    expect(layout.scrollWidth, `document wider than a ${width}px viewport`).toBeLessThanOrEqual(layout.clientWidth);
    expect(layout.ctaRight, `header CTA overflows a ${width}px viewport`).toBeLessThanOrEqual(layout.clientWidth);
    expect(layout.ctaHeight, `header CTA wraps at ${width}px`).toBeLessThanOrEqual(36);
    expect(layout.loginLines, `Log in wraps at ${width}px`).toBe(1);
  }
});

test("home header when signed in: My kits and Log out, then back after logging out", async ({ page }) => {
  await logIn(page, uniqueEmail("homenav"));
  await page.goto("/");
  const banner = page.getByRole("banner");
  await expect(banner.getByRole("link", { name: "My kits" })).toHaveAttribute("href", "/account");
  await expect(banner.getByRole("button", { name: "Log out" })).toBeVisible();
  await expect(banner.getByRole("link", { name: "Log in" })).toHaveCount(0);
  await expect(banner.getByRole("link", { name: "Get my launch kit" })).toHaveCount(0);

  await banner.getByRole("link", { name: "My kits" }).click();
  await page.waitForURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "My kits" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("banner").getByRole("button", { name: "Log out" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Get my launch kit" })).toBeVisible();
});

test("the home page HTML is the same for everyone, so a CDN-cached copy can't show the wrong header", async ({ page }) => {
  await logIn(page, uniqueEmail("homecache"));
  // What the server (or the CDN) sends a signed-in visitor: the signed-out header, fixed up in the browser.
  const html = await (await page.request.get("/")).text();
  expect(html).toContain('data-testid="nav-login"');
  expect(html).not.toContain('data-testid="nav-my-kits"');
  await page.goto("/");
  await expect(page.getByRole("banner").getByTestId("nav-my-kits")).toBeVisible();
});

test("header CTA is on every marketing page and Pricing links agree", async ({ page }) => {
  for (const path of ["/pricing", "/faq", "/login", "/privacy", "/terms", "/product-hunt-launch-checklist"]) {
    await page.goto(path);
    await expect(page.getByRole("banner").getByRole("link", { name: "Get my launch kit" })).toBeVisible();
  }
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
});

test("Ship Loop links carry a Soon badge instead of '(soon)' text", async ({ page, isMobile }) => {
  await page.goto("/");
  const regions = isMobile ? [page.getByRole("contentinfo")] : [page.getByRole("banner"), page.getByRole("contentinfo")];
  for (const region of regions) {
    const link = region.getByRole("link", { name: "Ship Loop (coming soon)", exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/ship-loop");
    await expect(link.getByText("Soon", { exact: true })).toBeVisible();
    await expect(region.getByText("(soon)")).toHaveCount(0);
  }
});

test("Get my launch kit always opens the start form, even after making a kit", async ({ page }) => {
  await makeSampleKit(page);
  await page.goto("/faq");
  await page.getByRole("banner").getByRole("link", { name: "Get my launch kit" }).click();
  await page.waitForURL((u) => u.pathname === "/" && u.search === "?plan=kit" && u.hash === "#start");
  await expect(page.getByLabel("GitHub repo or live site URL")).toBeFocused();
  await expect(page.locator("#start [data-plan]")).toHaveAttribute("data-plan", "kit");
});

test("invalid input shows a friendly error", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("GitHub repo or live site URL").fill("not a url");
  await page.getByRole("button", { name: "Get my free preview" }).first().click();
  await expect(page.getByTestId("kit-error")).toContainText("Paste something like github.com/you/your-app");

  // Switching the input (here to a site URL) clears the error about the old one.
  await page.getByLabel("GitHub repo or live site URL").fill("https://your-app.com");
  await expect(page.getByTestId("kit-error")).toHaveCount(0);
  await expect(page.getByLabel("GitHub repo or live site URL")).not.toHaveAttribute("aria-invalid");
});

test("newsletter signup succeeds", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Weekly launch teardowns").fill(`news-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByRole("status").filter({ hasText: "You're subscribed" })).toBeVisible();
});

test.describe("logged-out preview", () => {
  // Own preview rate-limit bucket, so this doesn't eat the budget the other specs share.
  test.use({ extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${Math.floor(Math.random() * 250) + 1}` } });

  test("free preview needs no account: a fresh visitor previews a live site and can share the link", async ({ page, browser }) => {
    expect(await page.context().cookies()).toEqual([]);
    const authRequests: string[] = [];
    const pages: string[] = [];
    page.on("request", (r) => {
      if (new URL(r.url()).pathname.startsWith("/api/auth")) authRequests.push(r.url());
    });
    page.on("framenavigated", (f) => {
      if (f === page.mainFrame()) pages.push(new URL(f.url()).pathname);
    });

    await page.goto("/");
    await page.getByLabel("GitHub repo or live site URL").fill("http://127.0.0.1:3419/");
    await page.getByRole("button", { name: "Get my free preview" }).first().click();
    await page.waitForURL(/\/kit\/[\w-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pagebird");
    await page.getByTestId("stage-tab-Product Hunt").click();
    await expect(page.locator('[data-task-id="ph.tagline"]')).toHaveAttribute("data-locked", "false");
    await expect(page.getByTestId("preview-paywall")).toBeVisible();
    // An account only comes in at unlock.
    await expect(page.getByRole("button", { name: "Unlock the full kit, £19" })).toBeVisible();
    expect(authRequests).toEqual([]);
    expect(pages.some((p) => p.startsWith("/login") || p.startsWith("/account"))).toBe(false);

    const other = await browser.newContext();
    const friend = await other.newPage();
    await friend.goto(page.url());
    await expect(friend.getByRole("heading", { level: 1 })).toHaveText("Pagebird");
    await expect(friend.getByTestId("preview-paywall")).toBeVisible();
    await other.close();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("newsletter form posts instead of leaking the email into the URL", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Weekly launch teardowns").fill(`nojs-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Subscribe" }).click();
    await page.waitForURL(/subscribed=1/);
    expect(page.url()).not.toContain("example.com");
  });
});
