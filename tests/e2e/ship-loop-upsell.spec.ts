import { expect, test, type BrowserContext, type Locator, type Page, type Request, type Route } from "@playwright/test";
import { logIn, makeSampleKit, payKit, uniqueEmail } from "./helpers";

const FIXTURE = "http://127.0.0.1:3419";

// posthog-js drops every event from a likely bot (HeadlessChrome UA or brand, navigator.webdriver).
test.use({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  // Own preview rate-limit bucket, so these previews don't eat the budget the other specs share.
  extraHTTPHeaders: { "x-forwarded-for": `192.0.2.${Math.floor(Math.random() * 250) + 1}` },
});
const notABot = (context: BrowserContext) =>
  context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });
test.beforeEach(({ context }) => notABot(context));
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "ignoreErrors" }));

interface PhEvent {
  event: string;
  properties: Record<string, unknown>;
}

const WAITLIST_EVENTS = ["waitlist_cta_viewed", "waitlist_signup", "waitlist_error"];

/** The waitlist events the fake PostHog has received for this kit, oldest first. */
async function waitlistEvents(page: Page, kitId: string): Promise<PhEvent[]> {
  const all = (await (await page.request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[];
  return all.filter((e) => WAITLIST_EVENTS.includes(e.event) && e.properties.kitId === kitId);
}

const named = (events: PhEvent[], name: string) => events.filter((e) => e.event === name);

/** Answers POST /api/waitlist with whatever `next()` says, without touching the real store. */
async function mockWaitlist(page: Page, next: () => { status: number; json?: unknown } | "network") {
  const requests: Request[] = [];
  await page.route("**/api/waitlist", async (route: Route) => {
    requests.push(route.request());
    const answer = next();
    if (answer === "network") return route.abort("internetdisconnected");
    return route.fulfill({ status: answer.status, json: answer.json ?? {} });
  });
  return requests;
}

function recordCheckouts(page: Page): Request[] {
  const checkouts: Request[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/checkout") checkouts.push(req);
  });
  return checkouts;
}

/**
 * shiploop_waitlist_ask in the fake PostHog the server asks (on kit:<id>): on, switched off, or (null) no such flag,
 * as when it's missing or PostHog errors. `delayMs`: answer that late.
 */
async function setWaitlistAsk(page: Page, kitId: string, value: boolean | null, delayMs = 0) {
  await page.request.post(`${FIXTURE}/ph/_flags`, { data: { distinctId: `kit:${kitId}`, flags: value === null ? {} : { shiploop_waitlist_ask: value }, delayMs } });
}

/**
 * Logs in, pays for a sample kit with the ask's kill switch set (on by default) and lands on its success page.
 * `landing`: a first page to open in this tab (e.g. "/?qa=1").
 */
async function payForKit(page: Page, tag: string, { landing, ask = true, delayMs = 0 }: { landing?: string; ask?: boolean | null; delayMs?: number } = {}) {
  if (landing) await page.goto(landing);
  await logIn(page, uniqueEmail(tag));
  const kitId = await makeSampleKit(page);
  await setWaitlistAsk(page, kitId, ask, delayMs);
  await payKit(page, kitId);
  return kitId;
}

/** Money or paid-plan wording: none of it belongs anywhere in the free waitlist ask, its success or its errors. */
const NOT_FREE = /£|\$\d|€|\/mo\b|\/yr\b|\bpay|price|subscri|billing|charg|amount|pre-?order|checkout|stripe|\u2014/i;

async function expectTouchTarget(target: Locator) {
  expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
}

test("kill switch on: the buyer sees the free waitlist ask on the success page; viewed once, signup only after a 2xx", async ({ page }) => {
  const kitId = await payForKit(page, "upsell-buyer");
  const checkouts = recordCheckouts(page);
  const requests = await mockWaitlist(page, () => ({ status: 200, json: { ok: true, duplicate: false } }));

  const upsell = page.getByTestId("ship-loop-upsell");
  await expect(upsell.getByRole("heading")).toHaveText("You're in. Your kit is on its way to your inbox.");
  await expect(upsell).toContainText("Ship Loop is coming soon. Join the waitlist, we'll email you when it launches. It's free.");
  await expect(upsell).not.toContainText(NOT_FREE);
  await expect(upsell.getByRole("link")).toHaveCount(0);
  await expect(upsell.getByRole("button")).toHaveText(["Join the waitlist"]);
  await expectTouchTarget(upsell.getByRole("textbox", { name: "Email" }));
  await expectTouchTarget(upsell.getByRole("button", { name: "Join the waitlist" }));

  await upsell.scrollIntoViewIfNeeded();
  await expect.poll(async () => named(await waitlistEvents(page, kitId), "waitlist_cta_viewed").length).toBe(1);

  const email = uniqueEmail("upsell-waitlist");
  await upsell.getByRole("textbox", { name: "Email" }).fill(email);
  await upsell.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(upsell.getByTestId("waitlist-status")).toHaveText("You're on the waitlist. We'll email you when Ship Loop launches.");
  await expect(upsell).not.toContainText(NOT_FREE);
  expect(requests.map((r) => r.postDataJSON())).toEqual([{ email, source: "kit_upsell" }]);

  await expect.poll(async () => named(await waitlistEvents(page, kitId), "waitlist_signup").length).toBe(1);
  const events = await waitlistEvents(page, kitId);
  expect(events.map((e) => e.event)).toEqual(["waitlist_cta_viewed", "waitlist_signup"]);
  expect(events[0]!.properties).toMatchObject({ signup_source: "kit_upsell", kitId });
  expect(events[1]!.properties).toMatchObject({ signup_source: "kit_upsell", kitId, duplicate: false });
  for (const e of events) expect(e.properties).not.toHaveProperty("is_test");
  expect(JSON.stringify(events)).not.toContain(email);
  expect(checkouts).toHaveLength(0);

  // Not on a later visit to the same kit.
  await page.goto(`/account/kits/${kitId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("ship-loop-upsell")).toHaveCount(0);
  expect(checkouts).toHaveLength(0);
});

test("errors are never dead ends: a 400 and a network failure each show a retry and the email fallback, and send waitlist_error, not waitlist_signup", async ({ page }) => {
  const kitId = await payForKit(page, "upsell-errors");
  const answers: ({ status: number; json?: unknown } | "network")[] = [
    { status: 400, json: { error: "Enter a valid email address." } },
    "network",
    { status: 200, json: { ok: true, duplicate: false } },
  ];
  const requests = await mockWaitlist(page, () => answers.shift()!);
  const upsell = page.getByTestId("ship-loop-upsell");
  const field = upsell.getByRole("textbox", { name: "Email" });
  const fallback = upsell.getByRole("link", { name: "Or email hello@launchloop.dev" });

  await field.fill(uniqueEmail("upsell-400"));
  await upsell.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(upsell.getByRole("alert")).toHaveText("Enter a valid email address.");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(fallback).toHaveAttribute("href", /^mailto:hello@launchloop\.dev\?subject=/);
  await expectTouchTarget(fallback);
  const edit = upsell.getByRole("button", { name: "Edit your email" });
  await expectTouchTarget(edit);
  await edit.click();
  await expect(field).toBeFocused();
  await expect.poll(async () => named(await waitlistEvents(page, kitId), "waitlist_error").map((e) => e.properties)).toEqual([
    expect.objectContaining({ signup_source: "kit_upsell", kitId, status: 400, reason: "invalid_email" }),
  ]);

  const email = uniqueEmail("upsell-retry");
  await field.fill(email);
  await upsell.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(upsell.getByRole("alert")).toHaveText("We couldn't reach LaunchLoop. Check your connection and try again.");
  await expect(fallback).toBeVisible();
  const retry = upsell.getByRole("button", { name: "Try again" });
  await expectTouchTarget(retry);
  await expect(upsell).not.toContainText(NOT_FREE);
  await expect.poll(async () => named(await waitlistEvents(page, kitId), "waitlist_error").map((e) => [e.properties.status, e.properties.reason])).toEqual([
    [400, "invalid_email"],
    [0, "network"],
  ]);
  expect(named(await waitlistEvents(page, kitId), "waitlist_signup")).toHaveLength(0);

  await retry.click();
  await expect(upsell.getByTestId("waitlist-status")).toHaveText("You're on the waitlist. We'll email you when Ship Loop launches.");
  expect(requests).toHaveLength(3);
  expect(requests[2]!.postDataJSON()).toEqual({ email, source: "kit_upsell" });
  await expect.poll(async () => named(await waitlistEvents(page, kitId), "waitlist_signup").length).toBe(1);
  const events = await waitlistEvents(page, kitId);
  for (const e of events) expect(e.properties).not.toHaveProperty("is_test");
  expect(JSON.stringify(events)).not.toContain("@example.com");
});

for (const [label, ask, delayMs] of [
  ["kill switch off (false)", false, 0],
  ["kill switch missing or PostHog erroring (no answer for the flag)", null, 0],
  ["kill switch too slow (answers on, but after the server's timeout)", true, 3000],
] as const) {
  test(`${label}: no waitlist ask on the success page, and no waitlist events`, async ({ page }) => {
    const kitId = await payForKit(page, `upsell-off-${delayMs}-${String(ask)}`, { ask, delayMs });
    // The success page itself is fine: the kit is there, only the ask is left out.
    await expect(page.getByTestId("stage-tab-Product Hunt")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("ship-loop-upsell")).toHaveCount(0);
    await expect(page.getByTestId("waitlist-form")).toHaveCount(0);
    await page.waitForTimeout(1000);
    expect(await waitlistEvents(page, kitId)).toEqual([]);
  });
}

test("QA traffic: a tab that landed with ?qa=1 tags the waitlist events is_test, through login and checkout", async ({ page }) => {
  const kitId = await payForKit(page, "upsell-qa", { landing: "/?qa=1" });
  await mockWaitlist(page, () => ({ status: 200, json: { ok: true, duplicate: false } }));
  const upsell = page.getByTestId("ship-loop-upsell");
  await upsell.scrollIntoViewIfNeeded();
  await upsell.getByRole("textbox", { name: "Email" }).fill(uniqueEmail("upsell-qa-waitlist"));
  await upsell.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(upsell.getByTestId("waitlist-status")).toBeVisible();
  await expect.poll(async () => (await waitlistEvents(page, kitId)).map((e) => [e.event, e.properties.is_test])).toEqual([
    ["waitlist_cta_viewed", true],
    ["waitlist_signup", true],
  ]);
});
