import { expect, test, type Page } from "@playwright/test";

async function expectAllCountsWithinLimits(page: Page) {
  const counts = page.getByTestId("char-count");
  const total = await counts.count();
  for (let i = 0; i < total; i++) {
    const badge = counts.nth(i);
    if (await badge.isVisible()) await expect(badge).toHaveAttribute("data-within", "true");
  }
}

test("sample app: free preview, mock checkout, full kit, ZIP and email", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  const kitUrl = new URL(page.url());
  const kitId = kitUrl.pathname.split("/").pop()!;

  // Free preview: brief, watermarked tagline + one X post, locked full kit.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Snapshelf");
  await expect(page.getByText("Product brief", { exact: true })).toBeVisible();
  await expect(page.getByTestId("preview-tagline")).toBeVisible();
  await expect(page.getByTestId("preview-xpost")).toContainText("Snapshelf");
  await expect(page.getByTestId("x-thread")).toHaveCount(0);
  expect((await request.get(`/api/kits/${kitId}/zip`)).status()).toBe(402);

  const previewImage = await request.get(`/api/og/${kitId}/og`);
  expect(previewImage.status()).toBe(200);
  expect(previewImage.headers()["content-type"]).toBe("image/png");

  // Mock Stripe Checkout.
  await page.getByRole("button", { name: "Unlock full kit for £19" }).click();
  await page.waitForURL(/\/checkout\/mock/);
  await expect(page.getByRole("note")).toContainText("Test mode");
  const email = `buyer-${Date.now()}@example.com`;
  await page.getByLabel("Email for your receipt and kit").fill(email);
  await page.getByRole("button", { name: /Pay £19/ }).click();

  // Full kit.
  await expect(page.getByRole("heading", { name: "Your launch kit is ready" })).toBeVisible({ timeout: 30_000 });
  await expectAllCountsWithinLimits(page);

  await page.getByRole("tab", { name: "X thread" }).click();
  const posts = page.getByTestId("x-thread").getByRole("region");
  const postCount = await posts.count();
  expect(postCount).toBeGreaterThanOrEqual(5);
  expect(postCount).toBeLessThanOrEqual(7);
  await expectAllCountsWithinLimits(page);

  for (const tab of ["LinkedIn", "Landing page", "Checklist"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expectAllCountsWithinLimits(page);
  }

  await page.getByRole("tab", { name: "Images" }).click();
  await expect(page.getByRole("img", { name: /Product Hunt gallery/ })).toBeVisible();

  const body = (await page.locator("main").innerText()).toLowerCase();
  expect(body).not.toMatch(/\bupvot/);

  // ZIP download.
  const zip = await request.get(`/api/kits/${kitId}/zip`);
  expect(zip.status()).toBe(200);
  expect(zip.headers()["content-type"]).toBe("application/zip");
  expect(zip.headers()["content-disposition"]).toContain("snapshelf-launch-kit.zip");
  expect((await zip.body()).byteLength).toBeGreaterThan(50_000);

  for (const variant of ["og", "x", "ph"]) {
    const image = await request.get(`/api/og/${kitId}/${variant}`);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");
  }

  // Email (mock outbox) with the ZIP attached.
  await expect
    .poll(async () => {
      const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; attachments: { filename: string }[] }[] };
      return emails.find((e) => e.to === email)?.attachments[0]?.filename ?? null;
    })
    .toBe("snapshelf-launch-kit.zip");
});

test("live site ingest picks up the page copy and brand colour", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("GitHub repo or live site URL").fill("http://127.0.0.1:3419/");
  await page.getByRole("button", { name: "Get my free preview" }).first().click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pagebird");
  await expect(page.getByText("Turns feature requests into ranked product specs").first()).toBeVisible();
  await expect(page.getByLabel("Palette")).toContainText("#e11d48");
  await expect(page.getByText("Brand colours (from your site)")).toBeVisible();
});

test("unknown kit shows a helpful not-found page", async ({ page }) => {
  await page.goto("/kit/doesNotExist1234567");
  await expect(page.getByRole("heading", { name: "We can't find that kit" })).toBeVisible();
});
