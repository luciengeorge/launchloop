import { expect, test, type APIRequestContext, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { makeSampleKit, uniqueEmail } from "./helpers";

const FIXTURE = "http://127.0.0.1:3419";
const FLAG = "exp_paywall_early_cta";
const MOBILE = { width: 375, height: 688 };
const DESKTOP = { width: 1699, height: 935 };

// Own preview rate-limit bucket, so these previews don't eat the budget the other specs share.
test.use({ extraHTTPHeaders: { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250) + 1}` } });
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "ignoreErrors" }));

/** The kill switch in the fake PostHog the server asks (on kit:<id>): on, switched off, or (null) no such flag, optionally answering late. */
async function setEarlyCta(request: APIRequestContext, kitId: string, value: boolean | null, delayMs = 0) {
  await request.post(`${FIXTURE}/ph/_flags`, { data: { distinctId: `kit:${kitId}`, flags: value === null ? {} : { [FLAG]: value }, delayMs } });
}

/** A sample kit with the early CTA on, open on its page. */
async function earlyCtaKit(page: Page): Promise<string> {
  const kitId = await makeSampleKit(page);
  await setEarlyCta(page.request, kitId, true);
  await page.goto(`/kit/${kitId}`);
  await expect(page.getByTestId("early-unlock-cta")).toBeVisible();
  return kitId;
}

const earlyButton = (page: Page) => page.getByTestId("early-unlock-cta").getByRole("button", { name: "Unlock the full kit, £19" });
const panelButton = (page: Page) => page.getByTestId("unlock-panel").getByRole("button", { name: "Unlock the full kit, £19" });
const stickyBar = (page: Page) => page.getByTestId("sticky-unlock-bar");
const top = (locator: Locator) => locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
/** Jumps (no scrolling through) to the middle of the locked sections, between the early CTA and the panel: where the sticky bar is for. */
const toLockedSections = (page: Page) =>
  page.getByTestId("paywall-locked-sections").getByRole("listitem").nth(4).evaluate((el) => el.scrollIntoView({ block: "center" }));

/** The first /api/checkout answers like this; later ones go through. */
async function failCheckoutOnce(page: Page, fail: Parameters<Page["route"]>[1]) {
  let failed = false;
  await page.route("**/api/checkout", async (route, request) => {
    if (failed || request.method() !== "POST") return route.continue();
    failed = true;
    return fail(route, request);
  });
}
const serverError = { status: 502, json: { error: "Couldn't start checkout. Please try again." } };

test.describe("flag off", () => {
  for (const value of [null, false] as const) {
    test(`${value === null ? "no flag" : "switched off"}: today's paywall, one £19 button, no early CTA or sticky bar`, async ({ page }) => {
      const kitId = await makeSampleKit(page);
      await setEarlyCta(page.request, kitId, value);
      const html = await (await page.request.get(`/kit/${kitId}`)).text();
      expect(html).not.toContain("early-unlock-cta");
      expect(html).not.toContain("sticky-unlock-bar");
      expect(html).not.toContain("data-unlock-zone");
      await page.goto(`/kit/${kitId}`);
      await expect(panelButton(page)).toBeEnabled();
      await expect(page.getByRole("button", { name: /£19/ })).toHaveCount(1);
      await expect(page.getByTestId("early-unlock-cta")).toHaveCount(0);
      await expect(stickyBar(page)).toHaveCount(0);
      // Straight under the heading come the locked sections, as before.
      const heading = page.getByTestId("preview-paywall").locator("#paywall-heading");
      const firstAfterHeading = await heading.evaluate((el) => el.parentElement!.nextElementSibling!.getAttribute("data-testid"));
      expect(firstAfterHeading).toBe("paywall-locked-sections");
    });
  }
});

test.describe("flag on, desktop", () => {
  test.use({ viewport: DESKTOP });

  test("the early CTA is in the server HTML under the heading, £19 like the panel, and starts the same checkout", async ({ page }) => {
    const kitId = await makeSampleKit(page);
    await setEarlyCta(page.request, kitId, true);
    const html = await (await page.request.get(`/kit/${kitId}`)).text();
    expect(html).toContain('data-testid="early-unlock-cta"');
    expect(html).not.toContain("£14");
    expect(html).not.toContain("LAUNCH14");

    await page.goto(`/kit/${kitId}`);
    await expect(earlyButton(page)).toBeEnabled();
    await expect(panelButton(page)).toBeEnabled();
    const headingTop = await top(page.locator("#paywall-heading"));
    expect((await top(earlyButton(page))) - headingTop).toBeLessThanOrEqual(250);
    // The sticky bar is for the one-column layout only.
    await expect(stickyBar(page)).toBeHidden();
    await expect(page.getByRole("button", { name: /£14/ })).toHaveCount(0);

    const checkout = page.waitForRequest((r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/checkout");
    await earlyButton(page).click();
    expect((await checkout).postDataJSON()).toMatchObject({ product: "kit", kitId });
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
    expect(new URL(page.url()).searchParams.get("kitId")).toBe(kitId);
    await expect(page.getByRole("button", { name: "Pay £19 (test mode)" })).toBeVisible();
  });

  test("a failed checkout from the early CTA shows the error there with Try again, which starts checkout", async ({ page }) => {
    await earlyCtaKit(page);
    await failCheckoutOnce(page, (route) => route.fulfill(serverError));
    await earlyButton(page).click();
    const error = page.getByTestId("early-unlock-cta").getByRole("alert");
    await expect(error).toContainText("Couldn't start checkout. Please try again.");
    await expect(error.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(error.getByRole("button", { name: "Email me a link instead" })).toBeVisible();
    // Only the button that failed says so; the panel is back to its button.
    await expect(page.getByTestId("unlock-panel").getByRole("alert")).toHaveCount(0);
    await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "cta");

    await error.getByRole("button", { name: "Try again" }).click();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
  });

  test("the unlock buttons' labels are at least 4.5:1 on their background", async ({ page }) => {
    await earlyCtaKit(page);
    for (const button of [earlyButton(page), panelButton(page)]) {
      const ratio = await button.evaluate((el) => {
        const rgb = (color: string) => {
          const ctx = document.createElement("canvas").getContext("2d")!;
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const lum = (color: string) => {
          const [r, g, b] = rgb(color).map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const style = getComputedStyle(el);
        const [a, b] = [lum(style.color), lum(style.backgroundColor)].sort((x, y) => y - x);
        return (a + 0.05) / (b + 0.05);
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});

test.describe("flag on, mobile", () => {
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  test("the early CTA is on screen with the heading; the sticky bar shows only between the buttons, covers none of them, and nothing shifts", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { cls: number }).cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) (window as unknown as { cls: number }).cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await earlyCtaKit(page);
    const heading = page.locator("#paywall-heading");
    expect((await top(earlyButton(page))) - (await top(heading))).toBeLessThanOrEqual(250);

    // Heading and early CTA on screen together: the bar stays away.
    await heading.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80));
    await expect(earlyButton(page)).toBeInViewport();
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "false");
    await expect(stickyBar(page)).toBeHidden();

    // Past the early CTA, in the locked sections: the bar is there, with the same £19 button.
    await toLockedSections(page);
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "true");
    await expect(stickyBar(page).getByRole("button", { name: "Unlock the full kit, £19" })).toBeInViewport();

    // Walk the whole page: wherever the bar shows, it covers no unlock button, the save-preview form or the footer.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const covered: string[] = [];
    let shown = 0;
    for (let y = 0; y < height; y += 200) {
      await page.evaluate((to) => window.scrollTo(0, to), y);
      await page.waitForTimeout(250);
      const overlap = await page.evaluate(() => {
        const bar = document.querySelector<HTMLElement>('[data-testid="sticky-unlock-bar"]')!;
        if (bar.dataset.visible !== "true") return null;
        const barTop = window.innerHeight - bar.offsetHeight;
        const targets = {
          early: document.querySelector('[data-testid="early-unlock-cta"] button'),
          panel: document.querySelector('[data-testid="unlock-panel"] button'),
          save: document.querySelector('[data-testid="save-preview"]'),
          footer: document.querySelector("footer"),
        };
        return Object.entries(targets)
          .filter(([, el]) => {
            const r = el?.getBoundingClientRect();
            return r && r.bottom > barTop && r.top < window.innerHeight;
          })
          .map(([name]) => name);
      });
      if (overlap) shown += 1;
      if (overlap?.length) covered.push(`${y}: ${overlap.join(",")}`);
    }
    expect(shown).toBeGreaterThan(0);
    expect(covered).toEqual([]);

    // The panel and its save-preview form, and the footer: no bar.
    await page.getByTestId("save-preview").scrollIntoViewIfNeeded();
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "false");
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "false");
    expect(await page.evaluate(() => (window as unknown as { cls: number }).cls)).toBe(0);
  });

  test("the sticky bar starts the same checkout", async ({ page }) => {
    const kitId = await earlyCtaKit(page);
    await toLockedSections(page);
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "true");
    const checkout = page.waitForRequest((r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/checkout");
    await stickyBar(page).getByRole("button", { name: "Unlock the full kit, £19" }).click();
    expect((await checkout).postDataJSON()).toMatchObject({ product: "kit", kitId });
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
  });

  test("a network failure from the sticky bar: a readable error in the bar, Try again, or email a link instead", async ({ page }) => {
    await earlyCtaKit(page);
    await toLockedSections(page);
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "true");
    await failCheckoutOnce(page, (route) => route.abort("internetdisconnected"));
    await stickyBar(page).getByRole("button", { name: "Unlock the full kit, £19" }).click();
    const error = stickyBar(page).getByRole("alert");
    await expect(error).toHaveText(/We couldn't reach checkout\. Check your connection and try again\./);
    await expect(error).toHaveAttribute("data-code", "network");

    await error.getByRole("button", { name: "Email me a link instead" }).click();
    await expect(page.getByLabel("Not ready yet? Save this preview")).toBeFocused();
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "false");

    // Back to the bar: the error is still there, and Try again goes through.
    await toLockedSections(page);
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "true");
    await stickyBar(page).getByRole("button", { name: "Try again" }).click();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
  });

  test("?unlock=1 still goes straight on to checkout, with the bar out of the way", async ({ page }) => {
    const kitId = await makeSampleKit(page);
    await setEarlyCta(page.request, kitId, true);
    await page.goto(`/kit/${kitId}?unlock=1`);
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
    expect(new URL(page.url()).searchParams.get("kitId")).toBe(kitId);
  });
});

test.describe("errors always carry a CTA (flag off too)", () => {
  test("panel checkout failure: Try again starts checkout", async ({ page }) => {
    await makeSampleKit(page);
    await failCheckoutOnce(page, (route) => route.fulfill(serverError));
    await panelButton(page).click();
    const error = page.getByTestId("unlock-panel").getByRole("alert");
    await expect(error).toContainText("Couldn't start checkout. Please try again.");
    await error.getByRole("button", { name: "Try again" }).click();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
  });

  test("a kit that's gone: no pointless retry, a way to a new preview", async ({ page }) => {
    await makeSampleKit(page);
    await failCheckoutOnce(page, (route) => route.fulfill({ status: 404, json: { error: "That kit doesn't exist any more. Generate a new preview." } }));
    await panelButton(page).click();
    const error = page.getByTestId("unlock-panel").getByRole("alert");
    await expect(error).toContainText("That kit doesn't exist any more.");
    await expect(error.getByRole("button", { name: "Try again" })).toHaveCount(0);
    await expect(error.getByRole("link", { name: "Make a new preview" })).toHaveAttribute("href", "/#start");
  });

  test("login link that didn't send: Try again or pay as a guest; a code that didn't work: resend it or change the email", async ({ page }) => {
    await makeSampleKit(page);
    let failLink = true;
    await page.route("**/api/auth/request", (route) =>
      failLink ? ((failLink = false), route.fulfill({ status: 500, json: { error: "We couldn't send your login link. Please try again.", code: "send" } })) : route.continue(),
    );
    await expect(panelButton(page)).toBeEnabled();
    await page.getByTestId("unlock-login-first").click();
    await page.getByLabel("Your email").fill(uniqueEmail("early-cta-link"));
    await page.getByRole("button", { name: "Continue to checkout" }).click();
    const linkError = page.getByTestId("login-link-error");
    await expect(linkError).toHaveRole("alert");
    await expect(linkError).toContainText("We couldn't send your login link.");
    await expect(linkError.getByRole("button", { name: "Pay as a guest instead" })).toBeVisible();
    await linkError.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "sent");

    await page.route("**/api/auth/verify", (route) => route.fulfill({ status: 400, json: { error: "That code isn't right or has expired. Check the latest email.", code: "invalid_code" } }));
    await page.getByLabel("6-digit code").fill("123456");
    await page.getByRole("button", { name: "Verify" }).click();
    const codeError = page.getByTestId("login-code-error");
    await expect(codeError).toHaveRole("alert");
    const resend = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/auth/request");
    await codeError.getByRole("button", { name: "Resend code" }).click();
    await resend;
    await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "sent");
    await expect(page.getByTestId("login-code-error")).toHaveCount(0);
    await page.getByLabel("6-digit code").fill("123456");
    await page.getByRole("button", { name: "Verify" }).click();
    await page.getByTestId("login-code-error").getByRole("button", { name: "Use a different email" }).click();
    await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "email");
    await expect(page.getByLabel("Your email")).toBeFocused();
  });

  test("save-preview link that didn't send: Try again", async ({ page }) => {
    await makeSampleKit(page);
    let fail = true;
    await page.route("**/api/auth/request", (route) =>
      fail ? ((fail = false), route.fulfill({ status: 500, json: { error: "We couldn't send your login link. Please try again.", code: "send" } })) : route.continue(),
    );
    const save = page.getByTestId("save-preview");
    await save.getByLabel("Not ready yet? Save this preview").fill(uniqueEmail("early-cta-save"));
    await save.getByRole("button", { name: "Email me a link" }).click();
    await save.getByRole("alert").getByRole("button", { name: "Try again" }).click();
    await expect(save).toContainText("Link sent to");
  });
});

interface PhEvent {
  event: string;
  distinct_id?: string;
  properties: Record<string, unknown>;
}
const phEvents = async (request: APIRequestContext) => (await (await request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[];
const forKit = (kitId: string, name: string) => async (request: APIRequestContext) => (await phEvents(request)).filter((e) => e.event === name && e.properties.kitId === kitId);

// posthog-js drops every event from a likely bot (HeadlessChrome UA or brand, navigator.webdriver).
const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const notABot = (context: BrowserContext) =>
  context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });

test.describe("events", () => {
  test.use({ userAgent });
  test.beforeEach(({ context }) => notABot(context));

  test("desktop, QA visit: unlock_cta_shown once per position, unlock_cta_clicked and checkout_failed, all with is_test; no exposure", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const kitId = await makeSampleKit(page);
    await setEarlyCta(page.request, kitId, true);
    const fallbacks = async () => (await phEvents(page.request)).filter((e) => e.event === "flag_fallback" && e.properties.flag === FLAG).length;
    const fallbacksBefore = await fallbacks();
    await page.goto(`/kit/${kitId}?qa=1`);
    await page.locator("#paywall-heading").scrollIntoViewIfNeeded();
    await expect(earlyButton(page)).toBeEnabled();
    const context = { kitId, earlyCta: true, isLoggedIn: false, viewport: "desktop", is_test: true };

    await expect.poll(async () => (await forKit(kitId, "unlock_cta_shown")(page.request)).map((e) => e.properties.position).sort()).toEqual(["panel", "top"]);
    for (const e of await forKit(kitId, "unlock_cta_shown")(page.request)) expect(e.properties).toMatchObject(context);

    await failCheckoutOnce(page, (route) => route.fulfill(serverError));
    await earlyButton(page).click();
    await page.getByTestId("early-unlock-cta").getByRole("button", { name: "Try again" }).click();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);

    await expect.poll(async () => (await forKit(kitId, "unlock_cta_clicked")(page.request)).map((e) => e.properties.retry)).toEqual([false, true]);
    for (const e of await forKit(kitId, "unlock_cta_clicked")(page.request)) expect(e.properties).toMatchObject({ ...context, position: "top" });
    const [failed] = await forKit(kitId, "checkout_failed")(page.request);
    expect(failed.properties).toMatchObject({ ...context, position: "top", code: "server", retry: false });
    expect(JSON.stringify(failed.properties)).not.toContain("Couldn't start checkout");

    // Still one per position for that view, and the kill switch never sends an exposure.
    expect((await forKit(kitId, "unlock_cta_shown")(page.request)).length).toBe(2);
    expect((await phEvents(page.request)).filter((e) => e.event === "$feature_flag_called" && e.properties.$feature_flag === FLAG)).toEqual([]);
    // PostHog answered, so the kill switch wasn't a fallback either.
    expect(await fallbacks()).toBe(fallbacksBefore);
  });

  test("mobile: the sticky bar's unlock_cta_shown is sent once however often it comes back", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    const kitId = await earlyCtaKit(page);
    for (let i = 0; i < 2; i++) {
      await toLockedSections(page);
      await expect(stickyBar(page)).toHaveAttribute("data-visible", "true");
      await page.getByTestId("save-preview").scrollIntoViewIfNeeded();
      await expect(stickyBar(page)).toHaveAttribute("data-visible", "false");
    }
    // The page jumped from the top straight past the early CTA, so it was never seen and isn't logged as seen.
    await expect.poll(async () => (await forKit(kitId, "unlock_cta_shown")(page.request)).map((e) => e.properties.position).sort()).toEqual(["panel", "sticky"]);
    await page.waitForTimeout(1000);
    const sticky = (await forKit(kitId, "unlock_cta_shown")(page.request)).filter((e) => e.properties.position === "sticky");
    expect(sticky).toHaveLength(1);
    expect(sticky[0].properties).toMatchObject({ earlyCta: true, viewport: "mobile" });
  });

  test("flag off: the panel's own unlock_cta_shown says so", async ({ page }) => {
    const kitId = await makeSampleKit(page);
    await page.getByTestId("unlock-panel").scrollIntoViewIfNeeded();
    await expect
      .poll(async () => (await forKit(kitId, "unlock_cta_shown")(page.request)).map((e) => e.properties))
      .toContainEqual(expect.objectContaining({ position: "panel", earlyCta: false, isLoggedIn: false }));
    expect((await forKit(kitId, "unlock_cta_shown")(page.request)).filter((e) => e.properties.position !== "panel")).toEqual([]);
  });

  test("PostHog too slow for the kill switch: today's paywall, flag_fallback (not an exposure)", async ({ page }) => {
    const kitId = await makeSampleKit(page);
    await setEarlyCta(page.request, kitId, true, 3000);
    const before = (await phEvents(page.request)).length;
    const started = Date.now();
    await page.goto(`/kit/${kitId}`);
    await expect(panelButton(page)).toBeEnabled();
    expect(Date.now() - started).toBeLessThan(3000);
    await expect(page.getByTestId("early-unlock-cta")).toHaveCount(0);
    await expect(stickyBar(page)).toHaveCount(0);
    await expect
      .poll(async () => (await phEvents(page.request)).slice(before).find((e) => e.event === "flag_fallback" && e.properties.flag === FLAG)?.properties)
      .toMatchObject({ variant: "control", reason: "timeout", fallback: true });
    expect((await phEvents(page.request)).filter((e) => e.event === "$feature_flag_called" && e.properties.$feature_flag === FLAG)).toEqual([]);
  });
});
