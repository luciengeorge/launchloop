import { expect, test } from "@playwright/test";
import { kitErrorBody, rateLimitedBody } from "../../src/lib/errors";
import { followMagicLink } from "./helpers";

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
  { name: "LLM failure", input: `${FIXTURE}/llmfail`, code: "llm_failed", text: "AI writer is having a moment", fix: "Nothing is wrong with your link" },
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
  await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
  await page.getByLabel("Your email").fill(email);
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  await followMagicLink(page, email);
  await page.waitForURL(/\/checkout\/mock/);
  await page.getByRole("button", { name: /Pay £19/ }).click();
  await page.waitForURL(new RegExp(`/account/kits/${kitId}`));

  const state = page.getByTestId("kit-error-state");
  await expect(state).toBeVisible({ timeout: 20_000 });
  await expect(state).toContainText("Your payment is safe");
  await expect(state.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/Simulated LLM failure|LlmError|at \w+ \(/);
});

test("unknown pages and kits get a helpful not-found page", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
  await expect(page).toHaveTitle("Page not found · LaunchLoop");
  await page.goto("/kit/doesNotExist1234567");
  await expect(page.getByRole("heading", { name: "We can't find that kit" })).toBeVisible();
});

test("preview requests are rate limited per IP across the hour; invalid URLs and the sample don't count", async ({ request }) => {
  const ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
  const post = (url: string, from = ip) => request.post("/api/kits", { data: { url }, headers: { "x-forwarded-for": from } });
  for (let i = 0; i < 5; i++) expect((await post("not a url")).status()).toBe(422);
  expect((await post("sample")).status()).toBe(201);
  // A missing repo is a valid request that costs a GitHub call, so it counts.
  const statuses: number[] = [];
  for (let i = 0; i < 41; i++) statuses.push((await post("github.com/real-owner/secret-repo")).status());
  expect(statuses.slice(0, 40).every((s) => s === 422)).toBe(true);
  expect(statuses[40]).toBe(429);
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
  await expect(alert).toContainText("Try again in 23 min");
  await expect(alert).not.toHaveClass(/text-destructive/);
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
