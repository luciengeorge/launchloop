import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("monthly is waitlist only, tagged shiploop_waitlist", async ({ page }) => {
  await page.goto("/ship-loop");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("radio", { name: "Monthly" }).click();
  await expect(page.getByText("£12", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Pre-order/ })).toHaveCount(0);
  await expect(page.getByTestId("preorder-closed")).toContainText("Monthly plans open when Ship Loop launches");
  const email = `wait-${Date.now()}@example.com`;
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Join the free waitlist" }).click();
  await expect(page.getByText("You're on the waitlist")).toBeVisible();

  // The e2e server's file store (DATA_DIR=.data-test, dev: prefix).
  const file = path.join(".data-test", `dev:contact:waitlist:${email}`.replace(/[^a-zA-Z0-9_.-]/g, "_") + ".json");
  const { value } = JSON.parse(await readFile(file, "utf8")) as { value: Record<string, string> };
  expect(value).toMatchObject({ email, source: "waitlist", plan: "monthly", tag: "shiploop_waitlist" });
});

test("waitlist errors are shown", async ({ page }) => {
  await page.route("**/api/waitlist", (route) => route.fulfill({ status: 500, json: { error: "Couldn't add you right now. Please try again." } }));
  await page.goto("/ship-loop");
  await page.getByRole("textbox", { name: "Email" }).fill(`wait-err-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Join the free waitlist" }).click();
  await expect(page.locator("#waitlist").getByRole("alert")).toHaveText("Couldn't add you right now. Please try again.");
});

test("£99 one-time founding pre-order through mock checkout", async ({ page, request }) => {
  await page.goto("/ship-loop");
  await expect(page.getByText("£99", { exact: true })).toBeVisible();
  await expect(page.getByText("one-time founding pre-order", { exact: true })).toBeVisible();
  await expect(page.locator("#plans")).toContainText("only starts once Ship Loop launches");
  await expect(page.locator("#plans")).toContainText("isn't live within 12 months of your pre-order, we refund you in full automatically");
  await page.getByRole("button", { name: "Pre-order Ship Loop, £99 one-time" }).click();
  await page.waitForURL(/\/checkout\/mock\?product=shiploop_preorder/);
  const email = `pre-${Date.now()}@example.com`;
  await page.getByLabel("Email for your receipt and kit").fill(email);
  await page.getByRole("button", { name: /Pay £99/ }).click();
  await page.waitForURL(/\/ship-loop\/thanks/);
  await expect(page.getByRole("heading", { name: /founding member/ })).toBeVisible();

  const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string }[] };
  expect(emails.find((e) => e.to === email)?.subject).toContain("Ship Loop pre-order confirmed");
});
