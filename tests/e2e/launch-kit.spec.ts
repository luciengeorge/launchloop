import { expect, test, type Page } from "@playwright/test";
import { makeSampleKit, unlockAndPay } from "./helpers";

async function expectAllCountsWithinLimits(page: Page) {
  const counts = page.getByTestId("char-count");
  const total = await counts.count();
  for (let i = 0; i < total; i++) {
    const badge = counts.nth(i);
    if (await badge.isVisible()) await expect(badge).toHaveAttribute("data-within", "true");
  }
}

test("sample app: blurred preview without leaks, unlock via magic link, instant full kit, ZIP and email", async ({ page, request }) => {
  const kitId = await makeSampleKit(page);
  const kitPath = `/kit/${kitId}`;

  // Locked kit: the full layout, free pieces readable, everything else blurred placeholder text.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Snapshelf");
  await expect(page.getByText("Product brief", { exact: true })).toBeVisible();
  const tagline = page.locator('[data-task-id="ph.tagline"]');
  await expect(tagline).toHaveAttribute("data-locked", "false");
  await expect(page.locator('[data-task-id="x.1"] [data-testid="task-text"]')).toContainText("Snapshelf");
  await expect(page.locator('[data-task-id="linkedin"]')).toHaveAttribute("data-locked", "true");
  expect(await page.getByTestId("locked-text").count()).toBeGreaterThan(10);
  await expect(page.getByRole("img", { name: /Product Hunt gallery.*watermarked/ })).toBeVisible();
  await expect(page.getByTestId("unlock-panel")).toBeVisible();
  expect((await request.get(`/api/kits/${kitId}/zip`)).status()).toBe(402);
  const previewImage = await request.get(`/api/og/${kitId}/og`);
  expect(previewImage.headers()["content-type"]).toBe("image/png");

  // Everything the locked page sent: HTML (incl. RSC payload) plus every response.
  const lockedBodies: string[] = [(await (await page.request.get(kitPath)).text())];
  page.on("response", async (res) => {
    if (/text|json|javascript|x-component/.test(res.headers()["content-type"] ?? "")) lockedBodies.push(await res.text().catch(() => ""));
  });
  await page.reload();
  await expect(page.getByTestId("unlock-panel")).toBeVisible();
  page.removeAllListeners("response");

  // Unlock → email → magic link → straight on to checkout with the email prefilled.
  const email = `buyer-${Date.now()}@example.com`;
  await unlockAndPay(page, kitId, email);

  // The speculative draft means the kit is visible right away, no spinner.
  await expect(page.getByRole("heading", { name: "Your launch kit is ready" })).toBeVisible({ timeout: 3000 });
  await expectAllCountsWithinLimits(page);
  const posts = page.getByTestId("group-X thread").getByTestId("task");
  const postCount = await posts.count();
  expect(postCount).toBeGreaterThanOrEqual(5);
  expect(postCount).toBeLessThanOrEqual(7);

  // None of the paid text was in anything the locked page received.
  const paidTexts = await page.locator('[data-locked="false"]:not([data-task-id="ph.tagline"]):not([data-task-id="x.1"]) [data-testid="task-text"]').allInnerTexts();
  expect(paidTexts.length).toBeGreaterThan(10);
  const sent = lockedBodies.join("\n");
  // Text that is also in the free brief (mock copy reuses it) isn't secret.
  const brief = await page.locator('section[aria-labelledby="brief-heading"]').innerText();
  let checked = 0;
  for (const text of paidTexts) {
    for (const line of text.split("\n").map((l) => l.trim()).filter((l) => l.length > 25 && !brief.includes(l))) {
      expect(sent, `locked page leaked: ${line}`).not.toContain(line);
      checked++;
    }
  }
  expect(checked).toBeGreaterThan(10);

  const body = (await page.locator("main").innerText()).toLowerCase();
  expect(body).not.toMatch(/\bupvot/);

  const zip = await request.get(`/api/kits/${kitId}/zip`);
  expect(zip.status()).toBe(200);
  expect(zip.headers()["content-type"]).toBe("application/zip");
  expect(zip.headers()["content-disposition"]).toContain("snapshelf-launch-kit.zip");
  expect((await zip.body()).byteLength).toBeGreaterThan(50_000);
  for (const variant of ["og", "x", "ph"]) {
    const image = await request.get(`/api/og/${kitId}/${variant}`);
    expect(image.headers()["content-type"]).toBe("image/png");
  }

  await expect
    .poll(async () => {
      const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; attachments: { filename: string }[] }[] };
      return emails.find((e) => e.to === email && e.attachments.length)?.attachments[0]?.filename ?? null;
    })
    .toBe("snapshelf-launch-kit.zip");
});

test("launch checklist: ticks persist to the account, show on /account, and 100% celebrates", async ({ page }) => {
  const kitId = await makeSampleKit(page);
  const email = `checklist-${Date.now()}@example.com`;
  await unlockAndPay(page, kitId, email);
  await expect(page.getByRole("heading", { name: "Your launch kit is ready" })).toBeVisible();

  const progress = page.getByTestId("progress");
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  const tasks = page.getByTestId("task");
  const total = await tasks.count();
  expect(total).toBeGreaterThan(20);

  await page.getByRole("checkbox", { name: "Mark “Hero headline” done" }).click();
  await page.getByRole("checkbox", { name: "Mark “LinkedIn post” done" }).click();
  await expect(page.locator('[data-task-id="linkedin"]')).toHaveAttribute("data-done", "true");
  const two = String(Math.round((2 / total) * 100));
  await expect(progress).toHaveAttribute("aria-valuenow", two);

  // Persisted server-side: survives a reload and shows on the dashboard.
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.locator('[data-task-id="linkedin"]')).toHaveAttribute("data-done", "true");
  await expect(page.getByTestId("progress")).toHaveAttribute("aria-valuenow", two);
  await page.goto("/account");
  await expect(page.locator(`[data-kit-id="${kitId}"] [data-testid="kit-progress"]`)).toContainText(`2/${total} · ${two}%`);

  // Untick works too, then finish everything.
  await page.goto(`/account/kits/${kitId}`);
  await page.getByRole("checkbox", { name: "Mark “LinkedIn post” done" }).click();
  await expect(page.locator('[data-task-id="linkedin"]')).toHaveAttribute("data-done", "false");
  const open = page.locator('[data-done="false"] [role="checkbox"]');
  while ((await open.count()) > 0) await open.first().click();
  await expect(page.getByTestId("progress")).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByTestId("all-done")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.goto("/account");
  await expect(page.locator(`[data-kit-id="${kitId}"] [data-testid="kit-progress"]`)).toContainText("100%");
});

test("progress can't be written by someone who isn't the owner", async ({ page, request }) => {
  const kitId = await makeSampleKit(page);
  const res = await request.post(`/api/kits/${kitId}/progress`, { data: { taskId: "linkedin", done: true } });
  expect(res.status()).toBe(403);
});

test("kit checkout requires an account", async ({ request, page }) => {
  const kitId = await makeSampleKit(page);
  const res = await request.post("/api/checkout", { data: { product: "kit", kitId } });
  expect(res.status()).toBe(401);
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
