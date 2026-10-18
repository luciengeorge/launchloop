import { expect, test } from "@playwright/test";
import { scrubProperties } from "../../src/lib/scrub-url";
import { logIn, magicLinkFor, makeSampleKit, uniqueEmail } from "./helpers";

test("after the preview: locked sections, the two free samples and a single unlock CTA", async ({ page }) => {
  await makeSampleKit(page);
  const paywall = page.getByTestId("preview-paywall");
  await expect(paywall.getByRole("heading", { level: 2 })).toHaveText("Like it? Here's the rest of Snapshelf's launch kit.");

  const sections = paywall.getByTestId("paywall-locked-sections").getByRole("listitem");
  await expect(sections).toHaveCount(7);
  for (const name of ["Landing page copy", "Product Hunt post", "X launch thread", "LinkedIn post", "3 social images", "Launch-day checklist", "ZIP and email copy"]) {
    await expect(sections.filter({ hasText: name })).toHaveCount(1);
  }

  // The samples are the free tagline and X post, the same text the locked pipeline shows unlocked.
  const samples = paywall.getByTestId("paywall-sample");
  await expect(samples).toHaveCount(2);
  await expect(sections.filter({ hasText: "Product Hunt post" })).toContainText("Your tagline is free: it's unlocked below.");
  await page.getByTestId("stage-tab-Product Hunt").click();
  const freeTagline = await page.locator('[data-task-id="ph.tagline"] [data-testid="task-text"]').innerText();
  await expect(samples.filter({ hasText: "Your Product Hunt tagline" }).locator("p")).toHaveText(freeTagline);
  await page.getByTestId("stage-tab-X").click();
  const freePost = await page.locator('[data-task-id="x.1"] [data-testid="task-text"]').innerText();
  await expect(samples.filter({ hasText: "Post 1 of your X thread" }).locator("p")).toHaveText(freePost);

  await expect(page.getByRole("button", { name: /£19/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Unlock the full kit, £19" })).toBeVisible();
  await expect(page.getByTestId("save-preview")).toBeVisible();
});

test("signed in: no save-preview field, the CTA goes straight to checkout", async ({ page }) => {
  await logIn(page, uniqueEmail("paywall"));
  const kitId = await makeSampleKit(page);
  await expect(page.getByTestId("save-preview")).toHaveCount(0);
  await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
  await page.waitForURL(/\/checkout\/mock\?product=kit/);
  expect(page.url()).toContain(`kitId=${kitId}`);
});

test("saving the preview by email claims it to the account from another browser, without starting checkout", async ({ page, browser }) => {
  const kitId = await makeSampleKit(page);
  const email = uniqueEmail("save");
  const save = page.getByTestId("save-preview");
  await save.getByLabel("Not ready yet? Save this preview").fill(email);
  await save.getByRole("button", { name: "Email me a link" }).click();
  await expect(save).toContainText(`Link sent to ${email}`);
  await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "cta");

  const other = await browser.newContext();
  const phone = await other.newPage();
  await phone.goto(await magicLinkFor(page.request, email));
  await phone.waitForURL(new RegExp(`/kit/${kitId}\\?saved=1&aid=[^&]+$`));
  await expect(phone.getByTestId("preview-saved")).toBeVisible();
  await expect(phone.getByTestId("unlock-panel")).toHaveAttribute("data-step", "cta");
  await phone.goto("/account");
  await expect(phone.locator(`[data-testid="account-kit"][data-kit-id="${kitId}"]`)).toBeVisible();
  await other.close();
});

test("analytics URL properties drop private kit ids and every non-utm query param", () => {
  const scrubbed = scrubProperties({
    $current_url: "https://launchloop.dev/kit/abcdefghijklmnop1234?unlock=1&utm_source=x#top",
    $pathname: "/account/kits/abcdefghijklmnop1234",
    $referrer: "https://launchloop.dev/login/verify?token=secret",
    $set_once: { $initial_current_url: "https://launchloop.dev/checkout/mock?product=kit&kitId=abcdefghijklmnop1234&email=a%40b.co" },
    kitId: "abcdefghijklmnop1234",
  });
  expect(scrubbed.$current_url).toBe("https://launchloop.dev/kit/[id]?utm_source=x");
  expect(scrubbed.$pathname).toBe("/account/kits/[id]");
  expect(scrubbed.$referrer).toBe("https://launchloop.dev/login/verify");
  expect((scrubbed.$set_once as Record<string, string>).$initial_current_url).toBe("https://launchloop.dev/checkout/mock");
  expect(scrubbed.kitId).toBe("abcdefghijklmnop1234");
});
