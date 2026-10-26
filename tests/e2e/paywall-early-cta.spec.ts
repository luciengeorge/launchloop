import { expect, test, type APIRequestContext, type BrowserContext, type Locator, type Page, type Route } from "@playwright/test";
import { CHECKOUT_TIMEOUT_MS } from "@/lib/unlock-checkout";
import { contrast, makeSampleKit, uniqueEmail } from "./helpers";

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

/** The label is at least 4.5:1 on the button, at rest and hovered (the button has transition-all). */
async function expectReadable(page: Page, button: Locator, name: string) {
  await button.scrollIntoViewIfNeeded();
  // Off the button (a click leaves the mouse on it) and past the transition, so "rest" isn't half hovered.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const rest = await contrast(button);
  expect(rest, name).toBeGreaterThanOrEqual(4.5);
  await button.hover();
  await page.waitForTimeout(300);
  const hovered = await contrast(button);
  expect(hovered, `${name} (hovered)`).toBeGreaterThanOrEqual(4.5);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  console.log(`contrast ${name}: ${rest.toFixed(2)} at rest, ${hovered.toFixed(2)} hovered`);
}

const serverError = { status: 502, json: { error: "Couldn't start checkout. Please try again." } };

type CheckoutAnswer = (route: Route) => Promise<void>;
/** Answers each /api/checkout in turn with the next of `answers`; once they run out, requests go through. */
async function answerCheckouts(page: Page, ...answers: CheckoutAnswer[]) {
  await page.route("**/api/checkout", (route, request) => {
    if (request.method() !== "POST") return route.continue();
    const answer = answers.shift();
    return answer ? answer(route) : route.continue();
  });
}
/** A plain-text 500, as a crashed server or a proxy sends it: no JSON, so no message of ours. */
const plain500: CheckoutAnswer = (route) => route.fulfill({ status: 500, contentType: "text/plain", body: "Internal Server Error" });
/** A gateway's own 503 page in front of the app: HTML, no checkout_unavailable code. */
const gateway503: CheckoutAnswer = (route) => route.fulfill({ status: 503, contentType: "text/html", body: "<html><body><h1>503 Service Temporarily Unavailable</h1></body></html>" });
/** Holds a request until `release` says how to answer it. */
function held() {
  let release!: (answer: CheckoutAnswer) => void;
  const decided = new Promise<CheckoutAnswer>((resolve) => (release = resolve));
  return { answer: (async (route) => (await decided)(route)) as CheckoutAnswer, release };
}
const OFFLINE = "Checkout is offline for a few minutes. Your preview is saved: try again shortly, or email hello@launchloop.dev and we'll send you a payment link.";

/** The error's message is the button's description, so it's read again when focus lands on the button. */
async function expectDescribedByError(button: Locator, error: Locator) {
  const describedBy = await button.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  expect(await error.locator("p").getAttribute("id")).toBe(describedBy);
}

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

  test("the early CTA and the panel's button: the shared orange with a dark label, at least 4.5:1 at rest and hovered", async ({ page }) => {
    await earlyCtaKit(page);
    for (const [name, button] of [["early CTA", earlyButton(page)], ["panel", panelButton(page)]] as const) {
      await expectReadable(page, button, name);
    }
    const fill = (button: Locator) => button.evaluate((el) => getComputedStyle(el).backgroundColor);
    await expect.poll(async () => (await fill(earlyButton(page))) === (await fill(panelButton(page)))).toBe(true);
  });

  test("after a plain-text 500: the early CTA, the panel's button and each error's Try again are at least 4.5:1 at rest and hovered", async ({ page }) => {
    await earlyCtaKit(page);
    await answerCheckouts(page, plain500, plain500);
    await earlyButton(page).click();
    const earlyRetry = page.getByTestId("early-unlock-cta").getByRole("alert").getByRole("button", { name: "Try again" });
    await expect(earlyRetry).toBeVisible();
    await expectReadable(page, earlyButton(page), "early CTA after a failure");
    await expectReadable(page, earlyRetry, "early CTA error: Try again");

    await panelButton(page).scrollIntoViewIfNeeded();
    await panelButton(page).click();
    const panelRetry = page.getByTestId("unlock-panel").getByRole("alert").getByRole("button", { name: "Try again" });
    await expect(panelRetry).toBeVisible();
    await expectReadable(page, panelButton(page), "panel after a failure");
    await expectReadable(page, panelRetry, "panel error: Try again");
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

for (const [label, viewport] of [
  ["375px", MOBILE],
  ["desktop", DESKTOP],
] as const) {
  test.describe(`error copy and focus, ${label}`, () => {
    test.use({ viewport });

    test("a plain-text 500: a friendly message with Try again; focus is on the unlock button after the failure, during Try again and after it fails again", async ({ page }) => {
      await earlyCtaKit(page);
      const retry = held();
      await answerCheckouts(page, plain500, retry.answer);
      const button = earlyButton(page);
      await button.scrollIntoViewIfNeeded();
      await button.click();

      const error = page.getByTestId("early-unlock-cta").getByRole("alert");
      await expect(error.locator("p")).toHaveText("Couldn't start checkout. Please try again.");
      await expect(page.getByTestId("preview-paywall")).not.toContainText(/Request failed|Internal Server Error/);
      await expect(error.getByRole("button", { name: "Try again" })).toBeVisible();
      await expect(error.getByRole("button", { name: "Email me a link instead" })).toBeVisible();
      await expect(button).toBeFocused();
      await expect(button).toBeEnabled();
      await expectDescribedByError(button, error);

      // While Try again's checkout is under way, focus waits on the (busy) unlock button rather than the page.
      await error.getByRole("button", { name: "Try again" }).click();
      await expect(button).toBeFocused();
      await expect(button).toHaveAttribute("aria-disabled", "true");
      retry.release(plain500);
      await expect(page.getByTestId("early-unlock-cta").getByRole("alert")).toBeVisible();
      await expect(button).toBeFocused();
      await expect(button).toBeEnabled();

      // From there, Enter on the focused button is the retry: checkout goes through.
      await page.keyboard.press("Enter");
      await page.waitForURL(/\/checkout\/mock\?product=kit/);
    });

    test("a plain 503 from a gateway (no code): the offline message with the email-us link; focus holds on the status, then returns to the panel's button", async ({ page }) => {
      await makeSampleKit(page);
      const retry = held();
      await answerCheckouts(page, gateway503, retry.answer);
      const button = panelButton(page);
      await button.scrollIntoViewIfNeeded();
      await button.click();

      const panel = page.getByTestId("unlock-panel");
      const error = panel.getByRole("alert");
      await expect(error).toHaveAttribute("data-code", "checkout_unavailable");
      await expect(error.locator("p")).toHaveText(OFFLINE);
      await expect(error.getByRole("link", { name: "Email us for a payment link" })).toHaveAttribute("href", "mailto:hello@launchloop.dev?subject=Payment%20link%20for%20my%20launch%20kit");
      await expect(error.getByRole("button", { name: "Email me a link instead" })).toBeVisible();
      await expect(error.getByRole("button", { name: "Try again" })).toBeVisible();
      await expect(button).toBeFocused();
      await expectDescribedByError(button, error);

      // The panel swaps its button for "Taking you to secure checkout…" while it waits: focus holds there, not on the body.
      await error.getByRole("button", { name: "Try again" }).click();
      await expect(page.getByTestId("checkout-redirecting")).toBeFocused();
      retry.release(gateway503);
      await expect(panel.getByRole("alert")).toHaveAttribute("data-code", "checkout_unavailable");
      await expect(button).toBeFocused();
      expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
    });
  });
}

test.describe("back to the paywall mid-checkout (bfcache)", () => {
  const BUSY = "Taking you to secure checkout…";
  const isCheckoutPost = (r: { method(): string; url(): string }) => r.method() === "POST" && new URL(r.url()).pathname === "/api/checkout";

  /** Counts checkout POSTs from here on. */
  function countPosts(page: Page) {
    let posts = 0;
    page.on("request", (r) => {
      if (isCheckoutPost(r)) posts += 1;
    });
    return () => posts;
  }

  /**
   * Leaves the page exactly as a bfcache restore brings it back: the checkout answered and the page started its
   * redirect, but the navigation is aborted (ERR_ABORTED keeps the page), so it's left waiting on a navigation that
   * isn't coming. Then the browser's own signal for a restore: pageshow with `persisted`.
   */
  async function stuckThenRestored(page: Page, click: () => Promise<void>) {
    await page.route("**/checkout/mock**", (route) => route.abort("aborted"));
    const answered = page.waitForResponse((r) => isCheckoutPost(r.request()));
    await click();
    await answered;
    const panel = page.getByTestId("unlock-panel");
    // The bug, reproduced: stuck on the busy copy with no unlock button to press.
    await expect(panel).toHaveAttribute("data-step", "redirecting");
    await expect(panel.getByText(BUSY)).toBeVisible();
    await page.waitForTimeout(500);
    await expect(panel).toHaveAttribute("data-step", "redirecting");
    await page.unroute("**/checkout/mock**");
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  }

  test("desktop: the early CTA and the panel are usable again, the busy copy is gone, and one click sends one POST", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await earlyCtaKit(page);
    await stuckThenRestored(page, () => earlyButton(page).click());

    const panel = page.getByTestId("unlock-panel");
    await expect(panel).toHaveAttribute("data-step", "cta");
    await expect(page.getByText(BUSY)).toHaveCount(0);
    for (const button of [earlyButton(page), panelButton(page)]) {
      await expect(button).toBeEnabled();
      await expect(button).not.toHaveAttribute("aria-disabled", "true");
    }
    // No error: nothing failed, the buyer just came back.
    await expect(page.getByTestId("preview-paywall").getByRole("alert")).toHaveCount(0);

    const posts = countPosts(page);
    await earlyButton(page).click();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
    expect(posts()).toBe(1);
  });

  test("375px: the sticky bar's own checkout, restored: its button works again with one POST", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await earlyCtaKit(page);
    await toLockedSections(page);
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "true");
    const sticky = stickyBar(page).getByRole("button", { name: "Unlock the full kit, £19" });
    await stuckThenRestored(page, () => sticky.click());

    await expect(page.getByText(BUSY)).toHaveCount(0);
    await toLockedSections(page);
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "true");
    await expect(sticky).toBeEnabled();
    await expect(sticky).not.toHaveAttribute("aria-disabled", "true");
    const posts = countPosts(page);
    await sticky.click();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
    expect(posts()).toBe(1);
  });

  test("a real Back from checkout (bfcache restore when the browser does one, else a reload): unlock works, one POST", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.addInitScript(() => {
      (window as unknown as { restored: boolean }).restored = false;
      window.addEventListener("pageshow", (e) => {
        if (e.persisted) (window as unknown as { restored: boolean }).restored = true;
      });
    });
    await earlyCtaKit(page);
    await earlyButton(page).click();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
    await page.goBack();
    await page.waitForURL(/\/kit\/[\w-]+$/);
    const restored = await page.evaluate(() => (window as unknown as { restored: boolean }).restored);
    test.info().annotations.push({ type: "bfcache", description: restored ? "restored from the bfcache" : "not restored (reloaded)" });

    await expect(page.getByText(BUSY)).toHaveCount(0);
    await expect(earlyButton(page)).toBeEnabled();
    await expect(panelButton(page)).toBeEnabled();
    const posts = countPosts(page);
    await earlyButton(page).click();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
    expect(posts()).toBe(1);
  });
});

test.describe("one checkout at a time", () => {
  /** Counts the page's checkout POSTs, holding them all until `release` lets them through. */
  async function countCheckouts(page: Page) {
    const gate = held();
    let posts = 0;
    await page.route("**/api/checkout", (route, request) => {
      if (request.method() !== "POST") return route.continue();
      posts += 1;
      return gate.answer(route);
    });
    return { posts: () => posts, release: () => gate.release((route) => route.continue()) };
  }
  const isCheckout = (url: URL) => url.pathname === "/api/checkout";

  test("two clicks on the early CTA in the same task start one checkout (one POST), which goes through", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await earlyCtaKit(page);
    const checkouts = await countCheckouts(page);
    const sent = page.waitForRequest((r) => r.method() === "POST" && isCheckout(new URL(r.url())));
    await earlyButton(page).evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await sent;
    await page.waitForTimeout(1500);
    expect(checkouts.posts()).toBe(1);
    checkouts.release();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
    expect(checkouts.posts()).toBe(1);
  });

  test("the early CTA and the panel's button clicked in the same task start one checkout, not two", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await earlyCtaKit(page);
    const checkouts = await countCheckouts(page);
    const sent = page.waitForRequest((r) => r.method() === "POST" && isCheckout(new URL(r.url())));
    await page.evaluate(() => {
      for (const button of document.querySelectorAll<HTMLButtonElement>('[data-testid="early-unlock-cta"] button, [data-testid="unlock-panel"] button')) {
        if (button.textContent?.includes("Unlock the full kit")) button.click();
      }
    });
    await sent;
    await page.waitForTimeout(1500);
    expect(checkouts.posts()).toBe(1);
    checkouts.release();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
  });

  test("after one fails, Try again still starts a new checkout (and only one)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await earlyCtaKit(page);
    let posts = 0;
    await page.route("**/api/checkout", (route, request) => {
      if (request.method() !== "POST") return route.continue();
      posts += 1;
      return posts === 1 ? plain500(route) : route.continue();
    });
    await earlyButton(page).evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    const error = page.getByTestId("early-unlock-cta").getByRole("alert");
    await expect(error).toBeVisible();
    expect(posts).toBe(1);
    await error.getByRole("button", { name: "Try again" }).click();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
    expect(posts).toBe(2);
  });
});

test.describe("flag on, narrow window with a mouse", () => {
  // Not a touch device, so :hover applies (Tailwind's hover only matches where the pointer can hover).
  test.use({ viewport: MOBILE });

  test("the sticky bar's button: the shared orange with a dark label, at least 4.5:1 at rest and hovered", async ({ page }) => {
    await earlyCtaKit(page);
    await toLockedSections(page);
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "true");
    await expectReadable(page, stickyBar(page).getByRole("button", { name: "Unlock the full kit, £19" }), "sticky bar");
  });

  test("after a plain-text 500 from the sticky bar: its button and its Try again are at least 4.5:1 at rest and hovered", async ({ page }) => {
    await earlyCtaKit(page);
    await toLockedSections(page);
    await expect(stickyBar(page)).toHaveAttribute("data-visible", "true");
    await answerCheckouts(page, plain500);
    await stickyBar(page).getByRole("button", { name: "Unlock the full kit, £19" }).click();
    const retry = stickyBar(page).getByRole("alert").getByRole("button", { name: "Try again" });
    await expect(retry).toBeVisible();
    await expectReadable(page, stickyBar(page).getByRole("button", { name: "Unlock the full kit, £19" }), "sticky bar after a failure");
    await expectReadable(page, retry, "sticky bar error: Try again");
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

  test("checkout offline (/api/checkout's 503 without Stripe in production): its message, Try again, and email us for a payment link", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await makeSampleKit(page);
    const offline = "Checkout is offline for a few minutes. Your preview is saved: try again shortly, or email hello@launchloop.dev and we'll send you a payment link.";
    await failCheckoutOnce(page, (route) => route.fulfill({ status: 503, json: { error: offline, code: "checkout_unavailable" } }));
    await panelButton(page).click();
    const error = page.getByTestId("unlock-panel").getByRole("alert");
    await expect(error).toHaveAttribute("data-code", "checkout_unavailable");
    await expect(error.locator("p")).toHaveText(offline);
    const emailUs = error.getByRole("link", { name: "Email us for a payment link" });
    await expect(emailUs).toHaveAttribute("href", "mailto:hello@launchloop.dev?subject=Payment%20link%20for%20my%20launch%20kit");
    await expect(error.getByRole("button", { name: "Email me a link instead" })).toBeVisible();
    // The link is outlined exactly like the Try again button beside it.
    const border = (locator: Locator) => locator.evaluate((el) => ({ width: getComputedStyle(el).borderTopWidth, color: getComputedStyle(el).borderTopColor }));
    const linkBorder = await border(emailUs);
    expect(linkBorder.width).toBe("1px");
    expect(linkBorder.color).not.toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
    expect(linkBorder).toEqual(await border(error.getByRole("button", { name: "Try again" })));
    // The panel keeps its unlock button, as #92 expects, and Try again runs the same checkout.
    await expect(panelButton(page)).toBeEnabled();
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

  test("sign-in link that didn't send: Try again or pay as a guest; a code that didn't work: resend it or change the email", async ({ page }) => {
    await makeSampleKit(page);
    let failLink = true;
    // /api/auth/request's own answer, worded for /login ("login link"): the paywall says "sign-in link", like its forms.
    await page.route("**/api/auth/request", (route) =>
      failLink ? ((failLink = false), route.fulfill({ status: 500, json: { error: "We couldn't send your login link. Please try again.", code: "send" } })) : route.continue(),
    );
    await expect(panelButton(page)).toBeEnabled();
    await page.getByTestId("unlock-login-first").click();
    await page.getByLabel("Your email").fill(uniqueEmail("early-cta-link"));
    await page.getByRole("button", { name: "Continue to checkout" }).click();
    const linkError = page.getByTestId("login-link-error");
    await expect(linkError).toHaveRole("alert");
    await expect(linkError.locator("p")).toHaveText("We couldn't send your sign-in link. Please try again.");
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

  for (const [kind, failure] of [
    ["the API's send error", { status: 500, json: { error: "We couldn't send your login link. Please try again.", code: "send" } }],
    ["a plain-text 500", { status: 500, contentType: "text/plain", body: "Internal Server Error" }],
  ] as const) {
    test(`save-preview link that didn't send (${kind}): "sign-in link" like the form above it, and Try again`, async ({ page }) => {
      await makeSampleKit(page);
      let fail = true;
      await page.route("**/api/auth/request", (route) => (fail ? ((fail = false), route.fulfill(failure)) : route.continue()));
      const save = page.getByTestId("save-preview");
      await expect(save).toContainText("A sign-in link that keeps this preview in your account.");
      await save.getByLabel("Not ready yet? Save this preview").fill(uniqueEmail("early-cta-save"));
      await save.getByRole("button", { name: "Email me a link" }).click();
      const error = save.getByRole("alert");
      await expect(error.locator("p")).toHaveText("We couldn't send your sign-in link. Please try again.");
      await expect(page.getByTestId("unlock-panel")).not.toContainText(/login link|Request failed/i);
      await error.getByRole("button", { name: "Try again" }).click();
      await expect(save).toContainText("Link sent to");
    });
  }
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

  /** Holds every checkout POST until the next `answer`, counting them. */
  async function heldCheckouts(page: Page) {
    const gates: ReturnType<typeof held>[] = [];
    await page.route("**/api/checkout", (route, request) => {
      if (request.method() !== "POST") return route.continue();
      const gate = held();
      gates.push(gate);
      return gate.answer(route);
    });
    return { posts: () => gates.length, answer: (answer: CheckoutAnswer) => gates.at(-1)!.release(answer) };
  }
  const doubleClick = (button: Locator) =>
    button.evaluate((el: HTMLButtonElement) => {
      el.click();
      el.click();
    });

  test("a double click on the panel's button: one POST and one unlock_cta_clicked; each real start after logs once", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const kitId = await makeSampleKit(page);
    const checkouts = await heldCheckouts(page);
    const clicked = forKit(kitId, "unlock_cta_clicked");
    await expect(panelButton(page)).toBeEnabled();
    await doubleClick(panelButton(page));

    await expect.poll(async () => (await clicked(page.request)).length).toBe(1);
    // Room for a late duplicate to arrive before checking there isn't one.
    await page.waitForTimeout(1500);
    expect(checkouts.posts()).toBe(1);
    const events = await clicked(page.request);
    expect(events).toHaveLength(1);
    expect(events[0].properties).toMatchObject({ kitId, position: "panel", earlyCta: false, retry: false });

    // Once that checkout fails, the next real start is logged once more, with the same properties.
    checkouts.answer(plain500);
    const error = page.getByTestId("unlock-panel").getByRole("alert");
    await expect(error).toBeVisible();
    await doubleClick(panelButton(page));
    await expect.poll(() => checkouts.posts()).toBe(2);
    await expect.poll(async () => (await clicked(page.request)).length).toBe(2);
    await page.waitForTimeout(1000);
    expect(checkouts.posts()).toBe(2);
    expect((await clicked(page.request)).map((e) => e.properties.retry)).toEqual([false, false]);

    checkouts.answer(plain500);
    await expect(error).toBeVisible();
    await error.getByRole("button", { name: "Try again" }).click();
    await expect.poll(async () => (await clicked(page.request)).map((e) => e.properties.retry)).toEqual([false, false, true]);
    expect(checkouts.posts()).toBe(3);
    checkouts.answer((route) => route.continue());
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
  });

  test("a double click on the early CTA: one POST and one unlock_cta_clicked", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const kitId = await earlyCtaKit(page);
    const checkouts = await heldCheckouts(page);
    const clicked = forKit(kitId, "unlock_cta_clicked");
    await doubleClick(earlyButton(page));
    await expect.poll(async () => (await clicked(page.request)).length).toBe(1);
    await page.waitForTimeout(1500);
    expect(checkouts.posts()).toBe(1);
    expect((await clicked(page.request)).map((e) => [e.properties.position, e.properties.earlyCta, e.properties.retry])).toEqual([["top", true, false]]);
    checkouts.answer((route) => route.continue());
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
  });

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

  test("a checkout that never answers: after the timeout, the network error with Try again, the buttons back, and one checkout_failed", async ({ page }) => {
    const kitId = await makeSampleKit(page);
    // Fake timers in the page, still flowing in real time, so the 15s timeout can be jumped over.
    await page.clock.install();
    await page.goto(`/kit/${kitId}`);
    await page.route("**/api/checkout", () => {});
    await expect(panelButton(page)).toBeEnabled();
    const sent = page.waitForRequest((r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/checkout");
    await panelButton(page).click();
    await sent;
    const panel = page.getByTestId("unlock-panel");
    await expect(panel).toHaveAttribute("data-step", "redirecting");
    await expect(panel.getByText("Taking you to secure checkout…")).toBeVisible();

    // Not yet: the request is still pending.
    await page.clock.fastForward(CHECKOUT_TIMEOUT_MS - 2000);
    await expect(panel).toHaveAttribute("data-step", "redirecting");
    await expect(panel.getByRole("alert")).toHaveCount(0);

    await page.clock.fastForward(2000);
    const error = panel.getByRole("alert");
    await expect(error).toHaveAttribute("data-code", "network");
    await expect(error.locator("p")).toHaveText("We couldn't reach checkout. Check your connection and try again.");
    await expect(error.getByRole("button", { name: "Try again" })).toBeEnabled();
    await expect(panel).toHaveAttribute("data-step", "cta");
    await expect(panelButton(page)).toBeEnabled();

    const failed = forKit(kitId, "checkout_failed");
    await expect.poll(async () => (await failed(page.request)).length).toBe(1);
    expect((await failed(page.request))[0].properties).toMatchObject({ position: "panel", code: "network", retry: false, earlyCta: false });
    // Still exactly one, however long it's left.
    await page.clock.fastForward(CHECKOUT_TIMEOUT_MS * 2);
    await page.waitForTimeout(1000);
    expect(await failed(page.request)).toHaveLength(1);

    // Checkout answers again: Try again goes through.
    await page.unroute("**/api/checkout");
    await error.getByRole("button", { name: "Try again" }).click();
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
  });

  test("a button under the 56px sticky header isn't shown: unlock_cta_shown waits until it's below the header", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const kitId = await earlyCtaKit(page);
    const header = page.getByRole("banner");
    expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    expect(await header.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(56);
    // Below the fold at load (button top about 1,066px at 935px tall), so nothing is seen yet.
    const button = earlyButton(page);
    const buttonTop = await top(button);
    expect(buttonTop).toBeGreaterThan(DESKTOP.height);

    // Jump so the whole 44px button sits behind the header, at 6px from the top of the viewport: in the viewport, not in view.
    await page.evaluate((y) => window.scrollTo(0, y), buttonTop - 6);
    expect(await button.evaluate((el) => [Math.round(el.getBoundingClientRect().top), Math.round(el.getBoundingClientRect().bottom)])).toEqual([6, 50]);
    const shownTop = async () => (await forKit(kitId, "unlock_cta_shown")(page.request)).filter((e) => e.properties.position === "top");
    // The panel's button is in view below the header at the same time, so its event shows the page is reporting.
    await expect.poll(async () => (await forKit(kitId, "unlock_cta_shown")(page.request)).map((e) => e.properties.position)).toContain("panel");
    await page.waitForTimeout(1500);
    expect(await shownTop()).toEqual([]);

    // Below the header, it's seen.
    await page.evaluate((y) => window.scrollTo(0, y), buttonTop - 200);
    await expect.poll(async () => (await shownTop()).length).toBe(1);
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
