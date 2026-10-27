import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const FIXTURE = "http://127.0.0.1:3419";
const TOKEN = "phc_playwright";

// posthog-js drops every event from a likely bot (HeadlessChrome UA or brand, navigator.webdriver), and replay never
// starts for one either: look like a real browser so the only thing deciding is the page.
test.use({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  extraHTTPHeaders: { "x-forwarded-for": `198.18.0.${Math.floor(Math.random() * 250) + 1}` },
});
const notABot = (context: BrowserContext) =>
  context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "ignoreErrors" }));

const RECORDER = readFileSync(path.join(process.cwd(), "node_modules/posthog-js/dist/lazy-recorder.js"), "utf8");

/**
 * What a PostHog project with replay on would send, and the real recorder posthog-js loads for it, so the only gate
 * left is the site's own (session-replay.ts). The project side even asks for console logs and network payloads: the
 * site's options must keep them out. Returns the recorder downloads, which only happen once recording starts.
 */
async function projectWithReplayOn(page: Page) {
  const downloads: string[] = [];
  await page.route(new RegExp(`/lp-relay/array/${TOKEN}/config(\\.js)?`), (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `(window._POSTHOG_REMOTE_CONFIG = window._POSTHOG_REMOTE_CONFIG || {})[${JSON.stringify(TOKEN)}] = { config: ${JSON.stringify({
        token: TOKEN,
        hasFeatureFlags: true,
        supportedCompression: ["gzip", "gzip-js"],
        sessionRecording: { endpoint: "/s/", consoleLogRecordingEnabled: true, recorderVersion: "v2", networkPayloadCapture: { recordHeaders: true, recordBody: true } },
      })}, siteApps: [] };`,
    }),
  );
  // posthog-js asks for it under its version: /lp-relay/static/<version>/lazy-recorder.js.
  await page.route(/\/lp-relay\/static\/(?:[^/]+\/)?(lazy-recorder|posthog-recorder|recorder)[^/]*\.js/, (route) => {
    downloads.push(new URL(route.request().url()).pathname);
    return route.fulfill({ contentType: "application/javascript", body: RECORDER });
  });
  return downloads;
}

interface PhEvent {
  event: string;
  properties: Record<string, unknown>;
}
const snapshots = async (page: Page) =>
  ((await (await page.request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[]).filter((e) => e.event === "$snapshot");

/** The recorder gzips the bulky parts of a snapshot (full DOM, mutations) into latin1 strings: open them so the checks see what PostHog stores. */
function decompressed(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith("\u001f\u008b")) return decompressed(JSON.parse(gunzipSync(Buffer.from(value, "latin1")).toString("utf8")));
  if (Array.isArray(value)) return value.map(decompressed);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decompressed(v)]));
  return value;
}

test.beforeEach(({ context }) => notABot(context));

test("the home page never starts recording; a kit page records, masked, with no kit id; leaving stops it", async ({ page }) => {
  const downloads = await projectWithReplayOn(page);
  const before = (await snapshots(page)).length;
  await page.goto("/");
  await page.waitForLoadState("load");
  // The SDK is up (it loads after the window load event): its $pageview has gone out.
  await expect.poll(async () => ((await (await page.request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[]).some((e) => e.event === "$pageview")).toBe(true);
  await page.waitForTimeout(2000);
  expect(downloads).toEqual([]);
  expect((await snapshots(page)).length).toBe(before);

  // Client navigation into a kit (the sample preview), where it starts.
  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  const kitId = new URL(page.url()).pathname.split("/").pop()!;
  await expect.poll(() => downloads.length, { timeout: 15_000 }).toBeGreaterThan(0);
  await page.getByTestId("preview-paywall").scrollIntoViewIfNeeded();
  // Leaving flushes what's buffered.
  await page.getByRole("banner").getByRole("link", { name: "Pricing" }).click();
  await page.waitForURL(/\/pricing$/);
  await expect.poll(async () => (await snapshots(page)).length - before, { timeout: 15_000 }).toBeGreaterThan(0);

  const recorded = (await snapshots(page)).slice(before);
  const raw = JSON.stringify(decompressed(recorded));
  // The full DOM snapshot is really in there, opened up: page structure, with its text masked to asterisks.
  expect(raw).toContain('"tagName":"section"');
  expect(raw).toMatch(/"textContent":"\*{5,}/);
  // Masked: the kit's product name and the page's copy never appear; the private kit id is scrubbed everywhere.
  expect(raw).not.toContain(kitId);
  expect(raw).not.toContain("Snapshelf");
  expect(raw).not.toContain("Unlock the full kit");
  expect(raw).toContain("/kit/[id]");
  // No console or network capture, whatever the project asked for.
  expect(raw).not.toContain("rrweb/console");
  expect(raw).not.toContain("rrweb/network");

  // Stopped on /pricing: nothing new is recorded there.
  const atPricing = (await snapshots(page)).length;
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(3000);
  const later = (await snapshots(page)).slice(atPricing);
  expect(JSON.stringify(decompressed(later))).not.toContain("/pricing");
});

for (const [label, setup] of [
  ["Global Privacy Control", (context: BrowserContext) => context.addInitScript(() => Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true }))],
  ["Do Not Track", (context: BrowserContext) => context.addInitScript(() => Object.defineProperty(Navigator.prototype, "doNotTrack", { get: () => "1" }))],
] as const) {
  test(`${label}: a kit page doesn't record either`, async ({ page, context }) => {
    await setup(context);
    const downloads = await projectWithReplayOn(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Try a sample app" }).click();
    await page.waitForURL(/\/kit\/[\w-]+$/);
    await page.reload();
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);
    expect(downloads).toEqual([]);
  });
}

test("a QA visit (?qa=1) doesn't record on a kit page", async ({ page }) => {
  const downloads = await projectWithReplayOn(page);
  await page.goto("/?qa=1");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  await page.reload();
  await page.waitForLoadState("load");
  await page.waitForTimeout(3000);
  expect(downloads).toEqual([]);
});

test("the privacy policy says masked replay runs on kit pages only, and how to opt out", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("article").getByText(/^Last updated 27 October 2026\./)).toBeVisible();
  const replay = page.getByTestId("privacy-session-replay");
  await expect(replay).toHaveText(
    "On kit pages only (the private link to each kit), PostHog also records a masked replay of how the page is used, so we can see what to make clearer. All text and everything you type is masked, and images and videos aren't recorded. Recordings are kept for 30 days and processed by PostHog in the EU. To opt out, turn on Global Privacy Control or Do Not Track in your browser, or email hello@launchloop.dev.",
  );
  await expect(replay.getByRole("link", { name: "hello@launchloop.dev" })).toHaveAttribute("href", "mailto:hello@launchloop.dev");
  await expect(page.getByRole("article")).not.toContainText("\u2014");
});
