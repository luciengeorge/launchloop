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

/** Open every stage so char-count / paid-text assertions can see the full kit. */
async function expandAllStages(page: Page) {
  const tabs = page.locator('[data-testid^="stage-tab-"]');
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    await expect(page.locator('section[data-state="current"]')).toBeVisible();
  }
}

test("sample app: blurred preview without leaks, unlock via magic link, instant full kit, ZIP and email", async ({ page, request }) => {
  const kitId = await makeSampleKit(page);
  const kitPath = `/kit/${kitId}`;

  // Locked kit: pipeline structure, free pieces readable, everything else blurred placeholder text.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Snapshelf");
  await expect(page.getByText("Product brief", { exact: true })).toBeVisible();
  await expect(page.getByTestId("launch-pipeline")).toBeVisible();
  await expect(page.getByTestId("stage-track")).toBeVisible();
  await expect(page.getByTestId("stage-tab-Brief")).toBeVisible();
  await expect(page.getByTestId("stage-tab-Launch day")).toBeVisible();

  // Free pieces live in Product Hunt / X — open those stages.
  await page.getByTestId("stage-tab-Product Hunt").click();
  const tagline = page.locator('[data-task-id="ph.tagline"]');
  await expect(tagline).toHaveAttribute("data-locked", "false");
  await page.getByTestId("stage-tab-X").click();
  await expect(page.locator('[data-task-id="x.1"] [data-testid="task-text"]')).toContainText("Snapshelf");
  await page.getByTestId("stage-tab-LinkedIn").click();
  await expect(page.locator('[data-task-id="linkedin"]')).toHaveAttribute("data-locked", "true");
  expect(await page.getByTestId("locked-text").count()).toBeGreaterThan(0);
  await expect(page.getByTestId("locked-text").first()).toHaveText(/^[•\s]+Locked\. Unlock the kit to read this\.$/);
  await page.getByTestId("stage-tab-Launch day").click();
  await expect(page.getByRole("heading", { name: "Launch-day step 1", exact: true })).toBeVisible();
  await expect(page.getByTestId("locked-kit")).not.toContainText(/lorem|ipsum/i);
  await page.getByTestId("stage-tab-Images").click();
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

  // Log in first → email → magic link → straight on to checkout with the email prefilled.
  const email = `buyer-${Date.now()}@example.com`;
  await unlockAndPay(page, kitId, email);

  // The speculative draft means the kit is visible right away, no spinner.
  await expect(page.getByRole("heading", { name: "Your launch kit is ready" })).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId("launch-pipeline")).toBeVisible();
  await expandAllStages(page);
  await expectAllCountsWithinLimits(page);
  await page.getByTestId("stage-tab-X").click();
  const posts = page.getByTestId("stage-X").getByTestId("task");
  const postCount = await posts.count();
  expect(postCount).toBeGreaterThanOrEqual(5);
  expect(postCount).toBeLessThanOrEqual(7);

  // None of the paid text was in anything the locked page received.
  const paidTexts: string[] = [];
  for (const stage of ["Landing", "Product Hunt", "X", "LinkedIn", "Launch day"]) {
    await page.getByTestId(`stage-tab-${stage}`).click();
    const texts = await page
      .locator('[data-locked="false"]:not([data-task-id="ph.tagline"]):not([data-task-id="x.1"]):not([data-task-id="brief.review"]) [data-testid="task-text"]')
      .allInnerTexts();
    paidTexts.push(...texts);
  }
  expect(paidTexts.length).toBeGreaterThan(10);
  const sent = lockedBodies.join("\n");
  // Text that is also in the free brief (mock copy reuses it) isn't secret.
  const brief = await page.locator('section[aria-labelledby="brief-heading"]').innerText();
  const isFreeBriefLine = (line: string) => {
    const plain = line.replace(/^[•\-*]\s+/, "");
    return brief.includes(line) || brief.includes(plain);
  };
  let checked = 0;
  for (const text of paidTexts) {
    for (const line of text.split("\n").map((l) => l.trim()).filter((l) => l.length > 25 && !isFreeBriefLine(l))) {
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
      const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string; attachments: { filename: string }[] }[] };
      return emails.find((e) => e.to === email && /launch kit is ready/.test(e.subject))?.attachments[0]?.filename ?? null;
    })
    .toBe("snapshelf-launch-kit.zip");
  const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string; text: string }[] };
  const receipt = emails.find((e) => e.to === email && /launch kit is ready/.test(e.subject))!;
  expect(receipt.subject).toContain("Payment received");
  expect(receipt.text).toContain(`/account/kits/${kitId}`);
  expect(receipt.text).toContain("X launch thread");
});

test("launch pipeline: stage navigation, ticks persist, advance on stage complete, 100% celebrates", async ({ page }) => {
  const kitId = await makeSampleKit(page);
  const email = `checklist-${Date.now()}@example.com`;
  await unlockAndPay(page, kitId, email);
  await expect(page.getByRole("heading", { name: "Your launch kit is ready" })).toBeVisible();

  const progress = page.getByTestId("progress");
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByTestId("stage-track")).toBeVisible();
  await expect(page.getByTestId("stage-Brief")).toHaveAttribute("data-state", "current");

  // Count total tasks across stages (open each tab).
  let total = 0;
  for (const stage of ["Brief", "Landing", "Product Hunt", "X", "LinkedIn", "Images", "Launch day"]) {
    await page.getByTestId(`stage-tab-${stage}`).click();
    total += await page.getByTestId(`stage-${stage}`).getByTestId("task").count();
  }
  expect(total).toBeGreaterThan(20);

  // Back to Brief — tick the brief review via Mark done; completing Brief advances to Landing.
  await page.getByTestId("stage-tab-Brief").click();
  await expect(page.locator('[data-task-id="brief.review"]')).toBeVisible();
  await page.getByRole("button", { name: "Mark done" }).click();
  await expect(page.getByTestId("stage-Landing")).toHaveAttribute("data-state", "current");
  await expect(page.getByTestId("stage-tab-Brief")).toHaveAttribute("data-state", "done");

  // Jump to LinkedIn and tick it (single-task stage advances immediately).
  await page.getByTestId("stage-tab-LinkedIn").click();
  await page.getByRole("checkbox", { name: "Mark “LinkedIn post” done" }).click();
  await expect(page.getByTestId("stage-tab-LinkedIn")).toHaveAttribute("data-state", "done");
  const two = String(Math.round((2 / total) * 100));
  await expect(progress).toHaveAttribute("aria-valuenow", two);

  // Persisted server-side: survives a reload and shows on the dashboard.
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.getByTestId("stage-tab-LinkedIn")).toHaveAttribute("data-state", "done");
  await expect(page.getByTestId("progress")).toHaveAttribute("aria-valuenow", two);
  await page.goto("/account");
  await expect(page.locator(`[data-kit-id="${kitId}"] [data-testid="kit-progress"]`)).toContainText(`2/${total} · ${two}%`);

  // Untick works too, then finish everything stage by stage.
  await page.goto(`/account/kits/${kitId}`);
  await page.getByTestId("stage-tab-LinkedIn").click();
  await page.getByRole("checkbox", { name: "Mark “LinkedIn post” done" }).click();
  await expect(page.getByTestId("stage-tab-LinkedIn")).not.toHaveAttribute("data-state", "done");

  // Some but not all of a stage ticked shows as in progress once you move off it.
  await page.getByTestId("stage-tab-Landing").click();
  await page.getByTestId("stage-Landing").locator('[data-done="false"] [role="checkbox"]').first().click();
  await page.getByTestId("stage-tab-Product Hunt").click();
  await expect(page.getByTestId("stage-tab-Landing")).toHaveAttribute("data-state", "partial");

  for (const stage of ["Brief", "Landing", "Product Hunt", "X", "LinkedIn", "Images", "Launch day"]) {
    await page.getByTestId(`stage-tab-${stage}`).click();
    const open = page.getByTestId(`stage-${stage}`).locator('[data-done="false"] [role="checkbox"]');
    while ((await open.count()) > 0) await open.first().click();
  }
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

test("kit checkout works without an account, but not for a kit that doesn't exist", async ({ request, page }) => {
  const kitId = await makeSampleKit(page);
  const res = await request.post("/api/checkout", { data: { product: "kit", kitId } });
  expect(res.status()).toBe(200);
  const url = new URL(((await res.json()) as { url: string }).url, "http://x");
  expect(url.pathname).toBe("/checkout/mock");
  expect(url.searchParams.get("kitId")).toBe(kitId);
  expect(url.searchParams.get("email")).toBeNull();
  expect((await request.post("/api/checkout", { data: { product: "kit", kitId: "doesNotExist1234567" } })).status()).toBe(404);
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
