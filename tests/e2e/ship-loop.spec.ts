import { expect, test } from "@playwright/test";

test("waitlist signup", async ({ page }) => {
  await page.goto("/ship-loop");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("radio", { name: "Monthly" }).click();
  await expect(page.getByText("£12", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Email" }).fill(`wait-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Join the free waitlist" }).click();
  await expect(page.getByText("You're on the waitlist")).toBeVisible();
});

test("yearly pre-order through mock checkout", async ({ page, request }) => {
  await page.goto("/ship-loop");
  await expect(page.getByText("£99", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pre-order Ship Loop" }).click();
  await page.waitForURL(/\/checkout\/mock\?product=shiploop_yearly/);
  const email = `pre-${Date.now()}@example.com`;
  await page.getByLabel("Email for your receipt and kit").fill(email);
  await page.getByRole("button", { name: /Pay £99/ }).click();
  await page.waitForURL(/\/ship-loop\/thanks/);
  await expect(page.getByRole("heading", { name: /founding member/ })).toBeVisible();

  const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string }[] };
  expect(emails.find((e) => e.to === email)?.subject).toContain("Ship Loop pre-order confirmed");
});
