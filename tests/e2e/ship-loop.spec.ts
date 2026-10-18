import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page, type Request } from "@playwright/test";

/** Every POST to /api/checkout this page makes. Only the £99 pre-order button may start a Ship Loop checkout. */
function recordCheckouts(page: Page): Request[] {
  const checkouts: Request[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/checkout") checkouts.push(req);
  });
  return checkouts;
}

test("waitlist signup: joined, then already on the list, tagged with the plan and source", async ({ page }) => {
  const checkouts = recordCheckouts(page);
  await page.goto("/ship-loop");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ship Loop is coming soon" })).toBeVisible();
  // Monthly is waitlist only, even with pre-orders open.
  await page.getByRole("radio", { name: "Monthly" }).click();
  await expect(page.getByText("£12", { exact: true })).toBeVisible();
  await expect(page.getByText("Planned pricing", { exact: true })).toBeVisible();
  await expect(page.locator("#plans").getByRole("button", { name: /pre-order/i })).toHaveCount(0);

  const email = `wait-${Date.now()}@example.com`;
  const plans = page.locator("#plans");
  const request = page.waitForRequest((req) => req.method() === "POST" && new URL(req.url()).pathname === "/api/waitlist");
  await plans.getByRole("textbox", { name: "Email" }).fill(email);
  await plans.getByRole("button", { name: "Join the waitlist" }).click();
  expect((await request).postDataJSON()).toMatchObject({ email, plan: "monthly", source: "ship_loop_page" });
  await expect(plans.getByTestId("waitlist-status")).toHaveText("You're on the waitlist. We'll email you when Ship Loop launches.");
  // The e2e server's file store (DATA_DIR=.data-test, dev: prefix).
  const file = path.join(".data-test", `dev:contact:waitlist:${email}`.replace(/[^a-zA-Z0-9_.-]/g, "_") + ".json");
  const { value } = JSON.parse(await readFile(file, "utf8")) as { value: Record<string, string> };
  expect(value).toMatchObject({ email, source: "waitlist", plan: "monthly", tag: "shiploop_waitlist", signup_source: "ship_loop_page" });

  await page.reload();
  await page.getByRole("radio", { name: "Monthly" }).click();
  await plans.getByRole("textbox", { name: "Email" }).fill(email.toUpperCase());
  await plans.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(plans.getByTestId("waitlist-status")).toHaveText("You're already on the waitlist. We'll email you when Ship Loop launches.");
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

test("home and /pricing offer no pre-order and start no checkout", async ({ page }) => {
  const checkouts = recordCheckouts(page);
  for (const path of ["/pricing", "/"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: /pre-order/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /pre-order/i })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/charged today|pre-order/i);
  }

  await page.goto("/ship-loop");
  await page.getByRole("link", { name: "Join the waitlist" }).first().click();
  await expect(page).toHaveURL(/#waitlist$/);
  await page.getByRole("radio", { name: "Monthly" }).click();
  await page.getByRole("radio", { name: /Yearly/ }).click();

  await page.goto("/pricing");
  const shipLoop = page.getByTestId("ship-loop-plan");
  await expect(shipLoop).toContainText("planned");
  await shipLoop.getByRole("link", { name: "Join the waitlist" }).click();
  await expect(page).toHaveURL(/\/ship-loop#plans$/);
  expect(checkouts).toHaveLength(0);
});

test("£99 one-time founding pre-order on Yearly through mock checkout", async ({ page, request }) => {
  await page.goto("/ship-loop");
  const preorder = page.getByTestId("preorder");
  await expect(preorder.getByText("£99", { exact: true })).toBeVisible();
  await expect(preorder.getByText("one-time founding pre-order", { exact: true })).toBeVisible();
  await expect(preorder).toContainText("It covers your first year of Ship Loop once it launches.");
  await expect(preorder).toContainText("isn't live within 12 months of your pre-order, we refund you in full automatically");
  await page.getByRole("button", { name: "Pre-order Ship Loop, £99 one-time" }).click();
  await page.waitForURL(/\/checkout\/mock\?product=shiploop_preorder/);
  const email = `pre-${Date.now()}@example.com`;
  await page.getByLabel("Email for your receipt and kit").fill(email);
  await page.getByRole("button", { name: "Pay £99 (test mode)" }).click();
  await page.waitForURL(/\/ship-loop\/thanks/);
  await expect(page.getByRole("heading", { name: /founding member/ })).toBeVisible();

  const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string }[] };
  expect(emails.find((e) => e.to === email)?.subject).toContain("Ship Loop pre-order confirmed");
});

test("/api/checkout answers a Ship Loop plan it doesn't sell with 400, never a 502", async ({ request }) => {
  for (const product of ["shiploop_monthly", "shiploop_yearly"]) {
    const res = await request.post("/api/checkout", { data: { product } });
    expect(res.status()).toBe(400);
  }
});
