import { expect, test, type APIRequestContext, type BrowserContext, type Page, type Request } from "@playwright/test";
import { isBeforePromoEnd } from "@/lib/launch-promo";
import { logIn, magicLinkFor, makeSampleKit, uniqueEmail } from "./helpers";

type Variant = "control" | "treatment";

/** The server ignores exp_launch14_promo from LAUNCH_PROMO_ENDS_AT, so tests that need the flag read can't run after it. */
const skipIfPromoEnded = () => test.skip(!isBeforePromoEnd(Date.now()), "LAUNCH14 has ended: the server no longer reads exp_launch14_promo");

const FIXTURE = "http://127.0.0.1:3419";

// Own preview rate-limit bucket, so these previews don't eat the budget the other specs share.
const ownBucket = { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250) + 1}` };
test.use({ extraHTTPHeaders: ownBucket });

/** Answers PostHog's flags request in the browser (flags posthog-js evaluates for the page's own id), optionally late. */
async function forceFlags(target: Page | BrowserContext, flags: Record<string, Variant>, delayMs = 0) {
  const details = Object.fromEntries(Object.entries(flags).map(([key, variant]) => [key, { key, enabled: true, variant, reason: null, metadata: {} }]));
  await target.route(/\/lp-relay\/flags/, async (route) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ json: { flags: details, errorsWhileComputingFlags: false } }).catch(() => undefined);
  });
}

/** Rolls the kit's paywall experiment to one variant (false: flag off) in the fake PostHog the server asks (bucketed on kit:<id>), optionally answering late. */
async function setKitPromo(request: APIRequestContext, kitId: string, variant: Variant | false, delayMs = 0) {
  await request.post(`${FIXTURE}/ph/_flags`, { data: { distinctId: `kit:${kitId}`, flags: { exp_launch14_promo: variant }, delayMs } });
}

interface PhEvent {
  event: string;
  distinct_id?: string;
  properties: Record<string, unknown>;
}

const distinctId = (e: PhEvent) => e.distinct_id ?? (e.properties.distinct_id as string | undefined);

async function phEvents(request: APIRequestContext): Promise<PhEvent[]> {
  return (await (await request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[];
}

async function exposures(request: APIRequestContext, flag = "exp_launch14_promo"): Promise<PhEvent[]> {
  return (await phEvents(request)).filter((e) => e.event === "$feature_flag_called" && e.properties.$feature_flag === flag);
}

const checkoutBody = (req: Request) => req.postDataJSON() as { product: string; analyticsId?: string; experiments: Record<string, string>; fallbacks: string[] };
const isCheckout = (req: Request) => req.method() === "POST" && new URL(req.url()).pathname === "/api/checkout";

async function payKit(page: Page, kitId: string, price: string) {
  await page.getByRole("button", { name: `Unlock the full kit, ${price}` }).click();
  await page.waitForURL(/\/checkout\/mock\?product=kit/);
  await page.getByRole("button", { name: `Pay ${price} (test mode)` }).click();
  await page.waitForURL(new RegExp(`/account/kits/${kitId}\\?paid=1&aid=`));
}

test("promo control: plain £19, no code on checkout, and the page sends nothing about the promo", async ({ page }) => {
  await logIn(page, uniqueEmail("promo-control"));
  const kitId = await makeSampleKit(page);
  await expect(page.getByTestId("kit-price")).toContainText("£19");
  await expect(page.getByTestId("kit-price").locator("s")).toHaveCount(0);
  await expect(page.getByTestId("launch-promo")).toHaveCount(0);

  const checkout = page.waitForRequest(isCheckout);
  await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
  // The page sends nothing about the promo; the server resolves it.
  expect(checkoutBody(await checkout)).toMatchObject({ experiments: {}, fallbacks: [] });
  await page.waitForURL(/\/checkout\/mock\?product=kit/);
  expect(new URL(page.url()).searchParams.get("promo")).toBeNull();
  expect(new URL(page.url()).searchParams.get("kitId")).toBe(kitId);
  await expect(page.getByTestId("mock-promo")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pay £19 (test mode)" })).toBeVisible();
});

test("promo treatment: £19 struck through, £14 with LAUNCH14, kept through the magic link on another device", async ({ page, browser }) => {
  skipIfPromoEnded();
  const kitId = await makeSampleKit(page);
  await setKitPromo(page.request, kitId, "treatment");
  await page.reload();
  const price = page.getByTestId("kit-price");
  await expect(price.locator("s")).toHaveText("Was £19");
  await expect(price).toContainText("£14");
  await expect(page.getByTestId("launch-promo")).toContainText("LAUNCH14 takes £5 off");

  const email = uniqueEmail("promo-treatment");
  await expect(page.getByRole("button", { name: "Unlock the full kit, £14" })).toBeEnabled();
  await page.getByTestId("unlock-login-first").click();
  await page.getByLabel("Your email").fill(email);
  const authRequest = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/auth/request");
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  const aid = (await authRequest).postDataJSON().intent.aid as string;
  expect(aid).toBeTruthy();
  await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "sent");

  // The variant is the kit's, so the phone gets it too; the link carries the first page's id for the funnel.
  const other = await browser.newContext();
  const phone = await other.newPage();
  const checkout = phone.waitForRequest(isCheckout);
  await phone.goto(await magicLinkFor(page.request, email));
  const body = checkoutBody(await checkout);
  expect(body.analyticsId).toBe(aid);
  expect(body.experiments).toEqual({});

  await phone.waitForURL(/\/checkout\/mock\?product=kit/);
  expect(new URL(phone.url()).searchParams.get("promo")).toBe("LAUNCH14");
  await expect(phone.getByTestId("mock-promo")).toHaveText("LAUNCH14 applied");
  await phone.getByRole("button", { name: "Pay £14 (test mode)" }).click();
  await phone.waitForURL(new RegExp(`/account/kits/${kitId}\\?paid=1&aid=${aid}$`));
  await other.close();

  // The receipt quotes what was charged, not the list price.
  let receipt = "";
  await expect
    .poll(
      async () => {
        const { emails } = (await (await page.request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string; text: string }[] };
        receipt = emails.find((e) => e.to === email && /launch kit is ready/.test(e.subject))?.text ?? "";
        return receipt;
      },
      { timeout: 60_000 },
    )
    .toContain("Receipt: LaunchLoop Launch Kit, £14 · Ref");
  expect(receipt).not.toContain("£19");
});

test("promo treatment: the price line, LAUNCH14 note and £14 button are in the server HTML and on every reload, with the browser's flags blocked", async ({ page }) => {
  const kitId = await makeSampleKit(page);
  await setKitPromo(page.request, kitId, "treatment");
  // Nothing on the paywall may depend on PostHog in the browser.
  await page.route(/\/lp-relay\//, (route) => route.abort());

  const html = await (await page.request.get(`/kit/${kitId}`)).text();
  expect(html).toContain("takes £5 off, applied for you at checkout");
  expect(html).toContain("Unlock the full kit, £14");
  expect(html).not.toContain("Unlock the full kit, £19");

  for (let i = 0; i < 5; i++) {
    await page.reload();
    const price = page.getByTestId("kit-price");
    await expect(price.locator("s")).toHaveText("Was £19");
    await expect(price).toContainText("once, no subscription");
    await expect(page.getByTestId("launch-promo")).toContainText("LAUNCH14 takes £5 off, applied for you at checkout. Launch offer for first-time buyers, while it lasts.");
    await expect(page.getByRole("button", { name: "Unlock the full kit, £14" })).toBeEnabled();
  }
});

test.describe("promo bucketing", () => {
  // posthog-js drops every event from a likely bot (HeadlessChrome UA or brand, navigator.webdriver).
  const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
  const notABot = (context: BrowserContext) =>
    context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
      Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
    });
  test.use({ userAgent });
  test.beforeEach(({ context }) => notABot(context));

  test("the same kit shows the same price on every reload, with one exposure per view on that view's id", async ({ page, browser }) => {
    skipIfPromoEnded();
    const kitId = await makeSampleKit(page);
    await setKitPromo(page.request, kitId, "treatment");
    // What posthog-js would bucket the visitor's anonymous id into must not matter.
    await forceFlags(page, { exp_launch14_promo: "control" });
    const before = (await exposures(page.request)).length;

    const views = 3;
    for (let i = 0; i < views; i++) {
      await page.reload();
      await expect(page.getByTestId("kit-price")).toContainText("£14");
      await expect(page.getByTestId("launch-promo")).toBeVisible();
      // The price is in the server HTML, so it shows before hydration; the exposure is sent once the page has hydrated.
      await expect.poll(async () => (await exposures(page.request)).length - before).toBe(i + 1);
    }
    const other = await browser.newContext({ userAgent, extraHTTPHeaders: ownBucket });
    await notABot(other);
    const friend = await other.newPage();
    await friend.goto(`/kit/${kitId}`);
    await expect(friend.getByTestId("kit-price")).toContainText("£14");
    // Closing the context skips unload, so wait for posthog-js to flush before it goes.
    await expect.poll(async () => (await exposures(page.request)).length - before).toBe(views + 1);
    await other.close();
    // Give a duplicate time to arrive before checking there isn't one.
    await page.waitForTimeout(1000);
    const sent = (await exposures(page.request)).slice(before);
    expect(sent).toHaveLength(views + 1);
    for (const e of sent) expect(e.properties).toMatchObject({ $feature_flag_response: "treatment", "$feature/exp_launch14_promo": "treatment" });
    // Reloads keep the tab's anonymous id; the other browser has its own.
    expect(new Set(sent.map((e) => e.distinct_id ?? e.properties.distinct_id)).size).toBe(2);
  });

  test("PostHog too slow for the kit: £19 served as a fallback, logged as flag_fallback (not an exposure), and checkout logs the same", async ({ page }) => {
    skipIfPromoEnded();
    await logIn(page, uniqueEmail("promo-fallback"));
    const kitId = await makeSampleKit(page);
    // Would be treatment, but the answer comes after the server's 1.5s flags budget.
    await setKitPromo(page.request, kitId, "treatment", 3000);
    const before = (await phEvents(page.request)).length;
    await page.reload();
    await expect(page.getByTestId("kit-price")).toContainText("£19");
    await expect(page.getByTestId("kit-price").locator("s")).toHaveCount(0);

    let fallback: PhEvent | undefined;
    await expect
      .poll(async () => {
        fallback = (await phEvents(page.request)).slice(before).find((e) => e.event === "flag_fallback" && e.properties.flag === "exp_launch14_promo");
        return fallback;
      })
      .toBeTruthy();
    expect(fallback!.properties).toMatchObject({ variant: "control", reason: "error", fallback: true });

    const request = page.waitForRequest(isCheckout);
    await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
    expect(checkoutBody(await request)).toMatchObject({ experiments: {}, fallbacks: [] });
    await page.waitForURL(/\/checkout\/mock\?product=kit/);
    expect(new URL(page.url()).searchParams.get("promo")).toBeNull();
    // The server didn't hear from PostHog either, had no earlier assignment for the kit, so control, logged.
    await expect
      .poll(async () => (await phEvents(page.request)).find((e) => e.event === "flag_fallback" && e.properties.source === "checkout" && e.properties.kitId === kitId)?.properties)
      .toMatchObject({ flag: "exp_launch14_promo", variant: "control", reason: "error", remembered: false });

    let started: PhEvent | undefined;
    await expect
      .poll(async () => {
        started = (await phEvents(page.request)).find((e) => e.event === "checkout_started" && e.properties.kitId === kitId);
        return started;
      })
      .toBeTruthy();
    expect(started!.properties["fallback/exp_launch14_promo"]).toBe("control");
    expect(started!.properties).not.toHaveProperty("$feature/exp_launch14_promo");
    // No exposure for this view: fallbacks stay out of the experiment.
    const id = distinctId(fallback!);
    expect((await exposures(page.request)).filter((e) => distinctId(e) === id)).toHaveLength(0);
  });

  test("Ship Loop upsell: flags too slow serves control, logs flag_fallback, never flips, and later events don't claim the late variant", async ({ page }) => {
    // After our 1.5s timeout, but inside posthog-js's own 3s flags timeout, so posthog-js does load the variant late.
    await forceFlags(page, { exp_shiploop_success_upsell: "treatment" }, 2500);
    await logIn(page, uniqueEmail("upsell-fallback"));
    const kitId = await makeSampleKit(page);
    const before = (await phEvents(page.request)).length;
    await payKit(page, kitId, "£19");

    let fallback: PhEvent | undefined;
    await expect
      .poll(async () => {
        fallback = (await phEvents(page.request)).slice(before).find((e) => e.event === "flag_fallback" && e.properties.flag === "exp_shiploop_success_upsell");
        return fallback;
      })
      .toBeTruthy();
    expect(fallback!.properties).toMatchObject({ variant: "control", reason: "timeout", fallback: true });

    // The flags arrive (treatment) after the timeout: the page keeps what it served.
    await page.waitForTimeout(3000);
    await expect(page.getByTestId("ship-loop-upsell")).toHaveCount(0);
    // A later event: posthog-js's $pageview for a new path (only utm_ params survive URL scrubbing).
    const tag = `later-${Date.now()}`;
    await page.evaluate((t) => history.pushState(null, "", `/account?utm_content=${t}`), tag);
    let later: PhEvent | undefined;
    await expect
      .poll(async () => {
        later = (await phEvents(page.request)).find((e) => e.event === "$pageview" && String(e.properties.$current_url).includes(tag));
        return later;
      })
      .toBeTruthy();
    expect(later!.properties).not.toHaveProperty("$feature/exp_shiploop_success_upsell");
    const id = distinctId(fallback!);
    expect((await exposures(page.request, "exp_shiploop_success_upsell")).filter((e) => distinctId(e) === id)).toHaveLength(0);
  });

  test("a control kit shows £19 on every reload, with a control exposure each view", async ({ page }) => {
    skipIfPromoEnded();
    const kitId = await makeSampleKit(page);
    await setKitPromo(page.request, kitId, "control");
    await forceFlags(page, { exp_launch14_promo: "treatment" });
    const before = (await exposures(page.request)).length;
    for (let i = 0; i < 2; i++) {
      await page.reload();
      await expect(page.getByTestId("kit-price")).toContainText("£19");
      await expect(page.getByTestId("kit-price").locator("s")).toHaveCount(0);
      await expect.poll(async () => (await exposures(page.request)).length - before).toBe(i + 1);
    }
    await expect.poll(async () => (await exposures(page.request)).slice(before).map((e) => e.properties.$feature_flag_response)).toEqual(["control", "control"]);
  });
});

/** POSTs /api/checkout for a kit as a script could, with whatever variant it likes in the body. */
function checkoutAs(page: Page, kitId: string) {
  return async (experiments: Record<string, string> = {}, fallbacks: string[] = []) => {
    const res = await page.request.post("/api/checkout", { data: { product: "kit", kitId, experiments, fallbacks } });
    const body = (await res.json()) as { url: string; promo: string };
    return { promo: body.promo, code: new URL(body.url, page.url()).searchParams.get("promo") };
  };
}

test("a forged client variant can't get the promo: the server resolves exp_launch14_promo for the kit", async ({ page }) => {
  skipIfPromoEnded();
  await logIn(page, uniqueEmail("promo-forged"));
  const kitId = await makeSampleKit(page);
  const checkout = checkoutAs(page, kitId);
  const forged = { exp_launch14_promo: "treatment" };

  // No assignment from PostHog and none remembered for the kit: control, whatever the body says.
  expect(await checkout(forged)).toEqual({ promo: "none", code: null });
  // A control kit.
  await setKitPromo(page.request, kitId, "control");
  expect(await checkout(forged)).toEqual({ promo: "none", code: null });
  // A kit in the promo arm gets LAUNCH14 even if the body claims control or a fallback: the server decides.
  await setKitPromo(page.request, kitId, "treatment");
  expect(await checkout({ exp_launch14_promo: "control" }, ["exp_launch14_promo"])).toEqual({ promo: "applied", code: "LAUNCH14" });
});

test("PostHog down at checkout: the kit's last assignment decides (logged); a flag switched off is control for everyone", async ({ page }) => {
  skipIfPromoEnded();
  await logIn(page, uniqueEmail("promo-remembered"));
  const kitId = await makeSampleKit(page);
  const checkout = checkoutAs(page, kitId);
  // The paywall resolves (and remembers) treatment for this kit.
  await setKitPromo(page.request, kitId, "treatment");
  await page.reload();
  await expect(page.getByTestId("kit-price")).toContainText("£14");

  // Now PostHog answers too late for the server's 1.5s budget: the remembered treatment still applies, so page and checkout agree.
  await setKitPromo(page.request, kitId, "treatment", 3000);
  await expect.poll(() => checkout()).toEqual({ promo: "applied", code: "LAUNCH14" });
  await expect
    .poll(async () => (await phEvents(page.request)).find((e) => e.event === "flag_fallback" && e.properties.kitId === kitId)?.properties)
    .toMatchObject({ flag: "exp_launch14_promo", variant: "treatment", reason: "error", fallback: true, source: "checkout", remembered: true });

  // Switching the flag off is honoured at once: no remembered promo.
  await setKitPromo(page.request, kitId, false);
  expect(await checkout()).toEqual({ promo: "none", code: null });
  await page.reload();
  await expect(page.getByTestId("kit-price")).toContainText("£19");
});

test("Ship Loop upsell control: the success page is unchanged", async ({ page }) => {
  await logIn(page, uniqueEmail("upsell-control"));
  const kitId = await makeSampleKit(page);
  await payKit(page, kitId, "£19");
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("ship-loop-upsell")).toHaveCount(0);
});

test("Ship Loop upsell treatment: a waitlist capture after paying, no pre-order and no checkout, only on the success page", async ({ page }) => {
  await forceFlags(page, { exp_shiploop_success_upsell: "treatment" });
  await logIn(page, uniqueEmail("upsell-treatment"));
  const kitId = await makeSampleKit(page);
  await payKit(page, kitId, "£19");
  const checkouts: Request[] = [];
  page.on("request", (req) => {
    if (isCheckout(req)) checkouts.push(req);
  });

  const upsell = page.getByTestId("ship-loop-upsell");
  await expect(upsell.getByRole("heading")).toHaveText("You're in. Your kit is on its way to your inbox.");
  await expect(upsell).toContainText("Ship Loop is coming soon. Join the waitlist, we'll email you when it launches.");
  await expect(upsell).not.toContainText(/pre-?order|£99|first year|12 months|charged today/i);
  await expect(upsell.getByRole("button")).toHaveText(["Join the waitlist"]);

  const waitlist = page.waitForRequest((req) => req.method() === "POST" && new URL(req.url()).pathname === "/api/waitlist");
  await upsell.getByRole("textbox", { name: "Email" }).fill(uniqueEmail("upsell-waitlist"));
  await upsell.getByRole("button", { name: "Join the waitlist" }).click();
  expect((await waitlist).postDataJSON()).toMatchObject({ source: "kit_upsell" });
  await expect(upsell.getByTestId("waitlist-status")).toHaveText("You're on the waitlist. We'll email you when Ship Loop launches.");
  expect(checkouts).toHaveLength(0);

  // Not on a later visit to the same kit.
  await page.goto(`/account/kits/${kitId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("ship-loop-upsell")).toHaveCount(0);
  expect(checkouts).toHaveLength(0);
});
