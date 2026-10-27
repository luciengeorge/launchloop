import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page, type Request } from "@playwright/test";
import { expectHungJoinRecovers, expectOneJoinPerBurst } from "./helpers";

/** Every POST to /api/checkout this page makes. Ship Loop is a free waitlist, so no Ship Loop surface may make one. */
function recordCheckouts(page: Page): Request[] {
  const checkouts: Request[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/checkout") checkouts.push(req);
  });
  return checkouts;
}

/** A record in the e2e server's file store (DATA_DIR=.data-test, dev: prefix). */
async function stored<T>(key: string): Promise<T> {
  const file = path.join(".data-test", `dev:${key}`.replace(/[^a-zA-Z0-9_.-]/g, "_") + ".json");
  return (JSON.parse(await readFile(file, "utf8")) as { value: T }).value;
}

test("waitlist signup: stored with email, timestamp and shiploop_waitlist tag; a repeat is a duplicate, not a second entry", async ({ page }) => {
  const checkouts = recordCheckouts(page);
  await page.goto("/ship-loop");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ship Loop is coming soon" })).toBeVisible();
  await expect(page.locator("#plans")).toContainText("Join the waitlist, we'll email you when it launches.");
  await expect(page.locator("#plans")).toContainText("Not on sale, so there's nothing to buy.");
  await expect(page.locator("#plans").getByRole("radio")).toHaveCount(0);

  const email = `wait-${Date.now()}@example.com`;
  const plans = page.locator("#plans");
  const request = page.waitForRequest((req) => req.method() === "POST" && new URL(req.url()).pathname === "/api/waitlist");
  await plans.getByRole("textbox", { name: "Email" }).fill(email);
  await plans.getByRole("button", { name: "Join the waitlist" }).click();
  expect((await request).postDataJSON()).toEqual({ email, source: "ship_loop_page" });
  await expect(plans.getByTestId("waitlist-status")).toHaveText("You're on the waitlist. We'll email you when Ship Loop launches.");
  const first = await stored<Record<string, string>>(`contact:waitlist:${email}`);
  expect(first).toMatchObject({ email, source: "waitlist", tag: "shiploop_waitlist", signup_source: "ship_loop_page" });
  expect(first).not.toHaveProperty("plan");
  expect(Date.parse(first.createdAt)).toBeGreaterThan(Date.now() - 60_000);
  expect(await stored<string[]>("contacts:waitlist")).toContain(email);

  await page.reload();
  await plans.getByRole("textbox", { name: "Email" }).fill(email.toUpperCase());
  await plans.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(plans.getByTestId("waitlist-status")).toHaveText("You're already on the waitlist. We'll email you when Ship Loop launches.");
  const again = await stored<Record<string, string>>(`contact:waitlist:${email}`);
  expect(again).toMatchObject({ email, tag: "shiploop_waitlist", createdAt: first.createdAt });
  expect((await stored<string[]>("contacts:waitlist")).filter((e) => e === email)).toHaveLength(1);
  expect(checkouts).toHaveLength(0);
});

test("waitlist signup: a server error is shown and the form stays", async ({ page }) => {
  await page.route("**/api/waitlist", (route) => route.fulfill({ status: 500, json: { error: "Couldn't add you right now. Please try again." } }));
  await page.goto("/ship-loop");
  const plans = page.locator("#plans");
  await plans.getByRole("textbox", { name: "Email" }).fill(`wait-err-${Date.now()}@example.com`);
  await plans.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(plans.getByRole("alert")).toHaveText("Couldn't add you right now. Please try again.");
  await expect(plans.getByRole("button", { name: "Join the waitlist" })).toBeEnabled();
});

test("waitlist signup: a request that never answers gives up after 15s with the network error and a working Try again", async ({ page }) => {
  await page.clock.install();
  await page.goto("/ship-loop");
  await expectHungJoinRecovers(page, page.locator("#plans"), `wait-hung-${Date.now()}@example.com`);
});

test("waitlist signup: two submits in one task, and more while it's out, send exactly one POST", async ({ page }) => {
  await page.goto("/ship-loop");
  await expectOneJoinPerBurst(page, page.locator("#plans"), `wait-burst-${Date.now()}@example.com`, "same-task");
});

test("no Ship Loop surface offers a pre-order or a £99 buy, repeats the old promises, or calls /api/checkout", async ({ page }) => {
  const checkouts = recordCheckouts(page);
  for (const path of ["/ship-loop", "/pricing", "/", "/faq", "/terms", "/privacy"]) {
    await page.goto(path);
    for (const role of ["button", "link"] as const) {
      await expect(page.getByRole(role, { name: /pre-?order|£99|buy ship loop|subscribe to ship loop/i }), `${path} ${role}`).toHaveCount(0);
    }
    await expect(page.locator("main"), path).not.toContainText(/pre-?order|charged today|first year|within 12 months of|credit (the|your)( full)? £19/i);
  }

  await page.goto("/ship-loop");
  await page.getByRole("link", { name: "Join the waitlist" }).first().click();
  await expect(page).toHaveURL(/#waitlist$/);
  // No plan toggles: the waitlist is the card's only control.
  await expect(page.locator("#plans").getByRole("radio")).toHaveCount(0);
  await expect(page.locator("#plans").getByRole("button")).toHaveText(["Join the waitlist"]);

  for (const path of ["/", "/pricing"]) {
    expect(await (await page.request.get(path)).text(), path).toContain("Waitlist, free to join");
    await page.goto(path);
    const label = page.getByText("Waitlist, free to join", { exact: true });
    await expect(label, path).toHaveCount(1);
    expect(await label.evaluate((el) => el.closest("p")!.textContent), path).toBe("Waitlist, free to join");
  }

  await page.goto("/pricing");
  const shipLoop = page.getByTestId("ship-loop-plan");
  await expect(shipLoop).toContainText("Waitlist, free to join");
  await expect(shipLoop).not.toContainText(/£|planned|\/month|\/year/);
  await shipLoop.getByRole("link", { name: "Join the waitlist" }).click();
  await expect(page).toHaveURL(/\/ship-loop#plans$/);
  expect(checkouts).toHaveLength(0);
});

test("waitlist card: sticky below the header on desktop, still usable on short screens, stacked below lg", async ({ page }) => {
  const plans = page.locator("#plans");
  const email = plans.getByRole("textbox", { name: "Email" });
  const headerBottom = async () => {
    const box = (await page.locator("header").first().boundingBox())!;
    return box.y + box.height;
  };

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/ship-loop");
  await page.locator("#compare-heading").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120));
  await expect(plans).toBeInViewport({ ratio: 1 });
  expect((await plans.boundingBox())!.y).toBeGreaterThanOrEqual(await headerBottom());
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(email).toBeInViewport();
  await expect(plans.getByRole("button", { name: "Join the waitlist" })).toBeInViewport();

  await page.setViewportSize({ width: 1280, height: 420 });
  await page.locator("#compare-heading").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120));
  const card = (await plans.boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(await headerBottom());
  expect(card.y + card.height).toBeLessThanOrEqual(420);
  await plans.getByRole("button", { name: "Join the waitlist" }).scrollIntoViewIfNeeded();
  await expect(email).toBeInViewport({ ratio: 1 });
  await expect(plans.getByRole("button", { name: "Join the waitlist" })).toBeInViewport({ ratio: 1 });

  await page.setViewportSize({ width: 768, height: 800 });
  expect(await plans.evaluate((el) => getComputedStyle(el.parentElement!).position)).toBe("static");
  expect(await plans.evaluate((el) => getComputedStyle(el).overflowY)).toBe("visible");
});

test("/api/checkout and the mock checkout answer every non-kit product with a 400 and the waitlist message, never a 502", async ({ request }) => {
  for (const url of ["/api/checkout", "/api/checkout/mock"]) {
    for (const product of ["shiploop_monthly", "shiploop_yearly", "shiploop_preorder", "anything", undefined]) {
      const res = await request.post(url, { data: { product, email: "buyer@launchloop.dev" } });
      expect(res.status(), `${url} ${product}`).toBe(400);
      expect(await res.json()).toEqual({ error: "Ship Loop isn't on sale. Join the waitlist, we'll email you when it launches.", code: "waitlist_only" });
    }
  }
});
