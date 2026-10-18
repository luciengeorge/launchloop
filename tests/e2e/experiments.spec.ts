import { expect, test, type APIRequestContext, type BrowserContext, type Page, type Request } from "@playwright/test";
import { logIn, magicLinkFor, makeSampleKit, uniqueEmail } from "./helpers";

type Variant = "control" | "treatment";

const FIXTURE = "http://127.0.0.1:3419";

// Own preview rate-limit bucket, so these previews don't eat the budget the other specs share.
const ownBucket = { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250) + 1}` };
test.use({ extraHTTPHeaders: ownBucket });

/** Answers PostHog's flags request in the browser (flags posthog-js evaluates for the page's own id). */
async function forceFlags(target: Page | BrowserContext, flags: Record<string, Variant>) {
  const details = Object.fromEntries(Object.entries(flags).map(([key, variant]) => [key, { key, enabled: true, variant, reason: null, metadata: {} }]));
  await target.route(/\/lp-relay\/flags/, (route) => route.fulfill({ json: { flags: details, errorsWhileComputingFlags: false } }));
}

/** Rolls the kit's paywall experiment to one variant in the fake PostHog the server asks (bucketed on kit:<id>). */
async function setKitPromo(request: APIRequestContext, kitId: string, variant: Variant) {
  await request.post(`${FIXTURE}/ph/_flags`, { data: { distinctId: `kit:${kitId}`, flags: { exp_launch14_promo: variant } } });
}

interface PhEvent {
  event: string;
  distinct_id?: string;
  properties: Record<string, unknown>;
}

async function exposures(request: APIRequestContext): Promise<PhEvent[]> {
  const events = (await (await request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[];
  return events.filter((e) => e.event === "$feature_flag_called" && e.properties.$feature_flag === "exp_launch14_promo");
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
  const kitId = await makeSampleKit(page);
  await setKitPromo(page.request, kitId, "treatment");
  await page.reload();
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

  // The variant is the kit's, so the phone gets it too; the link carries the first page's id for the funnel.
  const other = await browser.newContext();
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
    const kitId = await makeSampleKit(page);
    await setKitPromo(page.request, kitId, "treatment");
    // What posthog-js would bucket each page's fresh anonymous id into must not matter.
    await forceFlags(page, { exp_launch14_promo: "control" });
    const before = (await exposures(page.request)).length;

    const views = 3;
    for (let i = 0; i < views; i++) {
      await page.reload();
      await expect(page.getByTestId("kit-price")).toContainText("£14");
      await expect(page.getByTestId("launch-promo")).toBeVisible();
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
    expect(new Set(sent.map((e) => e.distinct_id ?? e.properties.distinct_id)).size).toBe(views + 1);
  });

  test("a control kit shows £19 on every reload, with a control exposure each view", async ({ page }) => {
    const kitId = await makeSampleKit(page);
    await setKitPromo(page.request, kitId, "control");
    await forceFlags(page, { exp_launch14_promo: "treatment" });
    const before = (await exposures(page.request)).length;
    for (let i = 0; i < 2; i++) {
      await page.reload();
      await expect(page.getByTestId("kit-price")).toContainText("£19");
      await expect(page.getByTestId("kit-price").locator("s")).toHaveCount(0);
    }
    await expect.poll(async () => (await exposures(page.request)).slice(before).map((e) => e.properties.$feature_flag_response)).toEqual(["control", "control"]);
  });
});

test("checkout applies LAUNCH14 for the kit's own variant, not the one a request claims", async ({ page }) => {
  await logIn(page, uniqueEmail("promo-forged"));
  const kitId = await makeSampleKit(page);
  await setKitPromo(page.request, kitId, "control");
  const forged = await page.request.post("/api/checkout", { data: { product: "kit", kitId, experiments: { exp_launch14_promo: "treatment" } } });
  const body = (await forged.json()) as { url: string; promo: string };
  expect(new URL(body.url, page.url()).searchParams.get("promo")).toBeNull();
  // The page claimed the promo, so it hears it's unavailable rather than being sent to £19 silently.
  expect(body.promo).toBe("unavailable");

  await setKitPromo(page.request, kitId, "treatment");
  const honest = (await (await page.request.post("/api/checkout", { data: { product: "kit", kitId, experiments: { exp_launch14_promo: "control" } } })).json()) as { url: string; promo: string };
  expect(new URL(honest.url, page.url()).searchParams.get("promo")).toBe("LAUNCH14");
  expect(honest.promo).toBe("applied");
});

test("Ship Loop upsell control: the success page is unchanged", async ({ page }) => {
  await logIn(page, uniqueEmail("upsell-control"));
  const kitId = await makeSampleKit(page);
  await payKit(page, kitId, "£19");
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("ship-loop-upsell")).toHaveCount(0);
});

test("Ship Loop upsell treatment: waitlist capture plus the £99 one-time pre-order after paying, only on the success page", async ({ page }) => {
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
  await expect(upsell).toContainText("Ship Loop is coming soon. Get notified when it launches.");
  // Mock mode sells the pre-order, so the upsell offers it next to the waitlist.
  const preorder = upsell.getByTestId("upsell-preorder");
  await expect(preorder).toContainText("Or pre-order as a founding member: £99, one time. It covers your first year of Ship Loop once it launches.");
  await expect(preorder).toContainText("auto-refunded in full if Ship Loop is not live within 12 months of the pre-order");

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
  await page.goBack();

  const checkout = page.waitForRequest(isCheckout);
  await page.getByRole("button", { name: "Pre-order Ship Loop, £99 one-time" }).click();
  const body = checkoutBody(await checkout);
  expect(body.product).toBe("shiploop_preorder");
  expect(body.experiments).toEqual({ exp_shiploop_success_upsell: "treatment" });
  await page.waitForURL(/\/checkout\/mock\?product=shiploop_preorder/);
  await expect(page.getByRole("button", { name: "Pay £99 (test mode)" })).toBeVisible();
});
