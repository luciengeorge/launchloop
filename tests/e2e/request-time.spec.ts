import { expect, test } from "@playwright/test";
import { makeSampleKit, uniqueEmail, unlockAndPay } from "./helpers";
import { serverLogSince, serverLogSize } from "./server-log";

// Next.js only logs this at request time: the build passes and the page still renders, so read the server output.
const SYNC_IO = /Route "([^"]+)": Next\.js encountered the unstable value (\S+)/g;

test("signed-in account and kit pages don't read the clock before a dynamic boundary", async ({ page }) => {
  const from = serverLogSize();
  const email = uniqueEmail("request-time");
  const paidId = await makeSampleKit(page);
  await unlockAndPay(page, paidId, email);
  const previewId = await makeSampleKit(page);

  await page.goto("/");
  await page.getByTestId("nav-my-kits").click();
  await page.waitForURL(/\/account$/);
  await expect(page.getByTestId("account-email")).toHaveText(email);
  await expect(page.locator(`[data-kit-id="${previewId}"]`)).toBeVisible();
  await page.locator(`[data-kit-id="${paidId}"]`).getByRole("link", { name: "Open kit" }).click();
  await page.waitForURL(new RegExp(`/account/kits/${paidId}$`));
  await expect(page.getByText("Your launch kit is ready")).toBeVisible();

  for (const path of ["/account", `/account/kits/${previewId}`, `/kit/${paidId}`, `/kit/${previewId}`]) {
    expect((await page.goto(path))?.status()).toBe(200);
  }
  await expect(page.getByTestId("locked-kit")).toBeVisible();

  const log = serverLogSince(from);
  test.skip(!log.includes(`to=${email}`), "the server log isn't captured (reusing a server Playwright didn't start)");
  expect([...log.matchAll(SYNC_IO)].map((m) => `${m[1]} ${m[2]}`)).toEqual([]);
});
