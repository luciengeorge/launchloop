import { expect, test, type Page, type Request } from "@playwright/test";

/** Every POST to /api/checkout this page makes. Ship Loop isn't on sale, so no Ship Loop surface may make one. */
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
  await expect(page.getByText("Ship Loop is coming soon. Get notified when it launches.")).toBeVisible();
  await page.getByRole("radio", { name: "Monthly" }).click();
  await expect(page.getByText("£12", { exact: true })).toBeVisible();
  await expect(page.getByText("Planned pricing", { exact: true })).toBeVisible();

  const email = `wait-${Date.now()}@example.com`;
  const plans = page.locator("#plans");
  const request = page.waitForRequest((req) => req.method() === "POST" && new URL(req.url()).pathname === "/api/waitlist");
  await plans.getByRole("textbox", { name: "Email" }).fill(email);
  await plans.getByRole("button", { name: "Join the waitlist" }).click();
  expect((await request).postDataJSON()).toMatchObject({ email, plan: "monthly", source: "ship_loop_page" });
  await expect(plans.getByTestId("waitlist-status")).toHaveText("You're on the waitlist. We'll email you when Ship Loop launches.");

  await page.reload();
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

test("no Ship Loop surface offers a pre-order or starts a checkout", async ({ page }) => {
  const checkouts = recordCheckouts(page);
  for (const path of ["/ship-loop", "/pricing", "/"]) {
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
