import { execFileSync } from "node:child_process";
import { closeSync, constants, openSync, readFileSync, renameSync, rmSync, write, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { KitSkeleton } from "@/components/kit/kit-skeleton";
import { UnlockPanel, UnlockPanelPlaceholder } from "@/components/kit/unlock-panel";
import { logIn, makeSampleKit, uniqueEmail } from "./helpers";

/** Puts panel markup into the paywall's real panel column (real width and CSS) and returns the unlock button's offset from the column's top. */
async function unlockButtonOffset(page: Page, html: string) {
  return page.getByTestId("preview-paywall").evaluate((paywall, markup) => {
    const column = paywall.lastElementChild as HTMLElement;
    column.innerHTML = markup;
    const button = [...column.querySelectorAll("button")].find((b) => b.textContent!.includes("Unlock the full kit"))!;
    return button.getBoundingClientRect().top - column.getBoundingClientRect().top;
  }, html);
}

// The e2e server answers the promo at once, so the placeholder never shows on its own here: both versions go into the live page instead.
test("while the price loads, the unlock button already sits where the full-price panel puts it", async ({ page }) => {
  await makeSampleKit(page);
  await expect(page.getByTestId("unlock-panel")).toBeVisible();
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const email of [undefined, "maker@example.com"]) {
      for (const cancelled of [false, true]) {
        const props = { email, autoCheckout: false, cancelled, saved: true };
        const panel = await unlockButtonOffset(page, renderToStaticMarkup(<UnlockPanel kitId="kit_0123456789abcdef" priceLabel="£19" launchPromo={{ variant: "control" }} {...props} />));
        const placeholder = await unlockButtonOffset(page, renderToStaticMarkup(<UnlockPanelPlaceholder {...props} />));
        expect(Math.abs(placeholder - panel), `${width}px wide, ${email ? "signed in" : "signed out"}, cancelled: ${cancelled}`).toBeLessThanOrEqual(1);
      }
    }
  }
});

test("the footer stays hidden while a page skeleton is up, so it can't be scrolled into view and then jump", async ({ page }) => {
  await page.goto("/pricing");
  const footer = page.locator("footer");
  await expect(footer).toBeVisible();
  await page.locator("main").evaluate((main, html) => main.insertAdjacentHTML("afterbegin", `<div id="skeleton">${html}</div>`), renderToStaticMarkup(<KitSkeleton />));
  await expect(footer).toHaveCSS("visibility", "hidden");
  await page.locator("#skeleton").evaluate((el) => el.remove());
  await expect(footer).toBeVisible();
});

/**
 * Makes the e2e server's reads of a kit record hang, so a page that needs it keeps its skeleton up: the record's file in
 * the store (DATA_DIR=.data-test) becomes a named pipe. The returned function puts the file back and lets the hung read finish.
 */
function stallKitRecord(kitId: string): () => Promise<void> {
  const file = path.join(".data-test", `dev_kit_${kitId}.json`);
  const record = readFileSync(file);
  rmSync(file);
  execFileSync("mkfifo", [file]);
  // Opened read-write, so neither this open nor the server's blocks; the server's read then waits for data and for this end to close.
  const pipe = openSync(file, constants.O_RDWR);
  return async () => {
    writeFileSync(`${file}.tmp`, record);
    renameSync(`${file}.tmp`, file);
    await new Promise<void>((resolve, reject) => write(pipe, record, (error) => (error ? reject(error) : resolve())));
    closeSync(pipe);
  };
}

/** Opens `url` while its data is stalled, clicks Pricing once the page has hydrated, then comes back once the data is in. */
async function leaveMidLoad(page: Page, { kitId, url, skeleton, content }: { kitId: string; url: string; skeleton: Locator; content: Locator }) {
  const footer = page.locator("footer");
  const pricing = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Pricing" });
  const release = stallKitRecord(kitId);
  try {
    await page.goto(url, { waitUntil: "commit" });
    await expect(skeleton).toBeVisible();
    await expect(footer).toHaveCSS("visibility", "hidden");
    await expect.poll(() => pricing.evaluate((link) => Object.keys(link).some((key) => key.startsWith("__reactProps")))).toBe(true);
    // Only a client-side navigation keeps the loading page around (hidden), which is the case under test.
    await page.evaluate(() => ((window as { stayed?: boolean }).stayed = true));
    await pricing.click();
    // The stalled document never finishes loading, so there's no load event to wait for.
    await page.waitForURL("/pricing", { waitUntil: "commit" });
    expect(await page.evaluate(() => (window as { stayed?: boolean }).stayed)).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(footer).toBeVisible();
  } finally {
    await release();
  }
  await page.goBack();
  await expect(content).toBeVisible();
  await expect(footer).toBeVisible();
}

test("leaving a page while its skeleton is up doesn't leave the footer hidden, there or back on the page", async ({ page }) => {
  const kitId = await makeSampleKit(page);
  await leaveMidLoad(page, { kitId, url: `/kit/${kitId}`, skeleton: page.getByLabel("Loading your kit"), content: page.getByTestId("preview-paywall") });

  await logIn(page, uniqueEmail("leave-mid-load"));
  const ownKit = await makeSampleKit(page);
  await leaveMidLoad(page, { kitId: ownKit, url: "/account", skeleton: page.locator("main [data-slot=skeleton]").first(), content: page.getByTestId("account-email") });
  await leaveMidLoad(page, {
    kitId: ownKit,
    url: `/account/kits/${ownKit}`,
    skeleton: page.getByLabel("Loading your kit"),
    content: page.getByTestId("preview-paywall"),
  });
});
