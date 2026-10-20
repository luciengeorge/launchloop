import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { kitErrorBody, rateLimitedBody } from "../../src/lib/errors";
import { followMagicLink, requestUnlockLogin } from "./helpers";

const FIXTURE = "http://127.0.0.1:3419";

const CASES = [
  { name: "invalid URL", input: "not a url", code: "invalid_url", text: "doesn't look like a link", fix: "github.com/you/your-app" },
  { name: "private or missing repo", input: "github.com/real-owner/secret-repo", code: "repo_not_found", text: "This repo is private or doesn't exist", fix: "Make the repo public, or paste your live site URL instead" },
  { name: "unknown GitHub owner", input: "https://github.com/no-such-owner-zz/thing", code: "repo_owner_not_found", text: "no-such-owner-zz", fix: "Check the spelling" },
  { name: "site that doesn't resolve", input: "https://launchloop-no-such-site.invalid", code: "site_unreachable", text: "couldn't reach that site", fix: "paste your GitHub repo instead" },
  { name: "site that times out", input: `${FIXTURE}/slow`, code: "site_timeout", text: "took too long", fix: "try again" },
  { name: "site returning an error", input: `${FIXTURE}/broken`, code: "site_http_error", text: "HTTP 500", fix: "try your homepage" },
  { name: "site with no usable content", input: `${FIXTURE}/empty`, code: "site_no_content", text: "couldn't find any words", fix: "renders everything with JavaScript" },
  { name: "link that isn't a web page", input: `${FIXTURE}/data.json`, code: "site_not_html", text: "isn't a web page", fix: "homepage or landing page URL" },
  { name: "every model fails", input: `${FIXTURE}/llmfail`, code: "ai_busy", text: "Our AI is busy, try again in a minute", fix: "Nothing is wrong with your link" },
];

for (const c of CASES) {
  test(`friendly inline error: ${c.name}`, async ({ page }) => {
    await page.goto("/");
    const input = page.getByLabel("GitHub repo or live site URL");
    await input.fill(c.input);
    await page.getByRole("button", { name: "Get my free preview" }).first().click();
    const alert = page.getByTestId("kit-error");
    await expect(alert).toHaveAttribute("data-code", c.code, { timeout: 15_000 });
    await expect(alert).toContainText(new RegExp(c.text, "i"));
    await expect(alert).toContainText(new RegExp(c.fix, "i"));
    // No stack traces or raw errors, the form is usable again, and we stay on the page.
    await expect(alert).not.toContainText(/Error:|at \w+ \(|TypeError|ECONN|fetch failed/);
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue(c.input);
    expect(new URL(page.url()).pathname).toBe("/");
  });
}

test("API returns structured errors with a code and a fix", async ({ request }) => {
  const res = await request.post("/api/kits", { data: { url: "github.com/real-owner/secret-repo" } });
  expect(res.status()).toBe(422);
  const body = (await res.json()) as { error: string; code: string; fix: string };
  expect(body.code).toBe("repo_not_found");
  expect(body.fix).toContain("live site URL");
});

test("paid kit whose generation keeps failing shows a proper error state with retry", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("GitHub repo or live site URL").fill(`${FIXTURE}/kitfail`);
  await page.getByRole("button", { name: "Get my free preview" }).first().click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  const kitId = new URL(page.url()).pathname.split("/").pop()!;
  const email = `kitfail-${Date.now()}@example.com`;
  await requestUnlockLogin(page, email);
  await followMagicLink(page, email);
  await page.waitForURL(/\/checkout\/mock/);
  await page.getByRole("button", { name: /Pay £19/ }).click();
  await page.waitForURL(new RegExp(`/account/kits/${kitId}`));

  const state = page.getByTestId("kit-error-state");
  await expect(state).toBeVisible({ timeout: 20_000 });
  await expect(state).toContainText("Your payment is safe");
  await expect(state).toContainText("you'll get your kit, or a full refund");
  await expect(state.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/Simulated LLM failure|LlmError|at \w+ \(/);
  // No template copy stands in for the paid kit.
  await expect(page.getByTestId("task")).toHaveCount(0);

  // Flagged for a manual refund, with the honest email sent once.
  const record = JSON.parse(readFileSync(path.join(process.cwd(), ".data-test", `dev_kit_${kitId}.json`), "utf8")) as { value: { status: string; refund_needed?: boolean; content?: unknown } };
  expect(record.value).toMatchObject({ status: "failed", refund_needed: true });
  expect(record.value.content).toBeUndefined();
  const failureEmails = async () => {
    const { emails } = (await (await page.request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string; text: string }[] };
    return emails.filter((e) => e.to === email && e.subject.startsWith("We hit a problem generating your"));
  };
  await expect.poll(async () => (await failureEmails()).length).toBe(1);
  expect((await failureEmails())[0].text).toContain("full refund");

  await page.goto("/account");
  const row = page.locator(`[data-testid="account-kit"][data-kit-id="${kitId}"]`);
  await expect(row.getByTestId("kit-status")).toHaveText("Paid · generation failed");
  await expect(row.getByTestId("kit-failed-note")).toContainText("full refund");
});

test("unknown pages and kits get a helpful not-found page", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
  await expect(page).toHaveTitle("Page not found · LaunchLoop");
  await page.goto("/kit/doesNotExist1234567");
  await expect(page.getByRole("heading", { name: "We can't find that kit" })).toBeVisible();
});

test("preview requests are rate limited per IP across the hour; invalid URLs, the sample and the first missing repos don't count", async ({ request }) => {
  const ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
  const post = (url: string, from = ip) => request.post("/api/kits", { data: { url }, headers: { "x-forwarded-for": from } });
  for (let i = 0; i < 5; i++) expect((await post("not a url")).status()).toBe(422);
  expect((await post("sample")).status()).toBe(201);
  // A missing repo gets its slot back 10 times an hour; past that it costs a GitHub call per try, so it counts (40 an hour here).
  const statuses: number[] = [];
  for (let i = 0; i < 51; i++) statuses.push((await post("github.com/real-owner/secret-repo")).status());
  expect(statuses.slice(0, 50).every((s) => s === 422)).toBe(true);
  expect(statuses[50]).toBe(429);
  const res = await post("github.com/real-owner/secret-repo");
  const body = (await res.json()) as { code: string; fix: string; retryAfterSeconds: number };
  expect(body.code).toBe("rate_limited");
  expect(body.retryAfterSeconds).toBeGreaterThan(0);
  expect(res.headers()["retry-after"]).toBe(String(body.retryAfterSeconds));
  expect(body.fix).toMatch(/Try again in \d+ (min|hours)/);
  // A different IP is unaffected.
  expect((await post("not a url", "198.51.100.7")).status()).toBe(422);
});

test("rate limited previews say when to try again", async ({ page }) => {
  await page.route("**/api/kits", (route) => route.fulfill({ status: 429, headers: { "Retry-After": "1380" }, json: rateLimitedBody(1380) }));
  await page.goto("/");
  await page.getByLabel("GitHub repo or live site URL").fill("github.com/acme/app");
  await page.getByRole("button", { name: "Get my free preview" }).first().click();
  const alert = page.getByTestId("kit-error");
  await expect(alert).toHaveAttribute("data-code", "rate_limited");
  await expect(alert).toContainText("You've used your free previews for now.");
  await expect(alert).toContainText("You can run 5 an hour and 20 a day.");
  await expect(alert).not.toHaveClass(/text-destructive/);
  // The wait lives only in the countdown, outside the alert, so screen readers don't hear it every minute.
  await expect(alert).not.toContainText("Try again in");
  await expect(alert.getByTestId("rate-limit-actions")).toHaveCount(0);
  const actions = page.getByTestId("rate-limit-actions");
  // No preview to unlock: the way forward is the pricing page, and the retry waits for the reset.
  await expect(actions.getByRole("link", { name: /^See the Launch Kit, .*£\d+$/ })).toHaveAttribute("href", "/pricing");
  const retry = actions.getByRole("button", { name: "Try again in 23 min" });
  await expect(retry).toBeDisabled();
  await expect(retry).toHaveAttribute("aria-disabled", "true");
  await retry.focus();
  await expect(retry).toBeFocused();
});

test("rate limited with a preview from this browser: 'Unlock my kit' opens it, and the retry comes back at the reset", async ({ page }) => {
  const kitId = "kit_limitedPreview01";
  let posts = 0;
  await page.route("**/api/kits", (route) => {
    posts += 1;
    return route.fulfill({ status: 429, headers: { "Retry-After": "2" }, json: { ...rateLimitedBody(2), kitId } });
  });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.getByLabel("GitHub repo or live site URL").fill("github.com/acme/app");
  await page.getByRole("button", { name: "Get my free preview" }).first().click();
  const actions = page.getByTestId("rate-limit-actions");
  const unlock = actions.getByRole("link", { name: /^Unlock my kit, .*£\d+$/ });
  await expect(unlock).toHaveAttribute("href", `/kit/${kitId}?unlock=1`);
  // Both actions fit a 375px screen.
  for (const action of [unlock, actions.getByTestId("rate-limit-retry")]) {
    const box = (await action.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  const retry = actions.getByRole("button", { name: /^Try again/ });
  const status = page.getByTestId("rate-limit-status");
  await expect(retry).toBeDisabled();
  await expect(status).toHaveText("");
  // Clicking while it counts down does nothing.
  await retry.click({ force: true });
  await expect(retry).toHaveText("Try again", { timeout: 5_000 });
  await expect(status).toHaveText("You can try again now");
  await expect(status).toHaveAttribute("aria-live", "polite");
  expect(posts).toBe(1);
  await retry.click();
  await expect.poll(() => posts).toBe(2);
});

test("busy (global cap or kill switch) shows the friendly notice, not an error", async ({ page }) => {
  await page.route("**/api/kits", (route) => route.fulfill({ status: 503, json: kitErrorBody("busy") }));
  await page.goto("/");
  await page.getByLabel("GitHub repo or live site URL").fill("github.com/acme/app");
  await page.getByRole("button", { name: "Get my free preview" }).first().click();
  const alert = page.getByTestId("kit-error");
  await expect(alert).toHaveAttribute("data-code", "busy");
  await expect(alert).toContainText("LaunchLoop is very busy right now, try again in a bit.");
  await expect(alert).toContainText("Kits you've already unlocked aren't affected");
  await expect(alert).not.toHaveClass(/text-destructive/);
  await expect(page.getByLabel("GitHub repo or live site URL")).toBeEnabled();
});
