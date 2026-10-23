import { expect, test, type Page } from "@playwright/test";
import { parse } from "node-html-parser";
import { png } from "../unit/png";

/** What each directory's listing requires on the home page: a followed link to it. Their bots reject these rel values. */
const BADGES = [
  { name: "Featured on Startup Fame", href: "https://startupfa.me", host: "startupfa.me", width: 126, height: 40 },
  { name: "Featured on Twelve Tools", href: "https://twelve.tools", host: "twelve.tools", width: 148, height: 40 },
];
const NOT_FOLLOWED = /\b(nofollow|ugc|sponsored)\b/i;
const isBadgeHost = (url: URL) => BADGES.some((b) => url.hostname === b.host);

/**
 * The badge images live on the directories' hosts. Tests serve a 1x1 stand-in instead, so they never depend on those
 * hosts, and a box sized from the image rather than from its width and height would visibly change once it loads.
 */
async function stubBadgeImages(page: Page) {
  const requested: string[] = [];
  await page.route(isBadgeHost, (route) => {
    requested.push(route.request().url());
    return route.fulfill({ contentType: "image/png", body: Buffer.from(png(1, 1)) });
  });
  return requested;
}

const badgeLink = (page: Page, name: string) => page.getByRole("contentinfo").getByRole("link", { name: new RegExp(`^${name}`) });

test("/ serves both directory badges in the footer HTML, as followed links with sized, lazy images", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  const footers = parse(await res.text()).querySelectorAll("footer");
  expect(footers).toHaveLength(1);
  for (const { name, href, width, height } of BADGES) {
    const links = footers[0].querySelectorAll(`a[href="${href}"]`);
    expect(links, href).toHaveLength(1);
    expect(links[0].getAttribute("rel") ?? "", `${href} rel`).not.toMatch(NOT_FOLLOWED);
    const img = links[0].querySelector("img")!;
    expect(img.getAttribute("alt")).toBe(name);
    expect(img.getAttribute("width")).toBe(String(width));
    expect(img.getAttribute("height")).toBe(String(height));
    expect(img.getAttribute("loading")).toBe("lazy");
  }
  expect(footers[0].querySelector("[aria-labelledby=footer-featured-on] h2")?.text).toBe("Featured on");
});

for (const width of [375, 1280]) {
  test(`footer Featured on row at ${width}px: both badges visible, followed, in their reserved boxes, fetched only near the footer`, async ({ page }) => {
    const requested = await stubBadgeImages(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(500);
    expect(requested, "badge images fetched before the footer is near the viewport").toEqual([]);

    const row = page.getByRole("region", { name: "Featured on" });
    await row.scrollIntoViewIfNeeded();
    for (const { name, href, width: w, height: h } of BADGES) {
      const link = badgeLink(page, name);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
      expect((await link.getAttribute("rel")) ?? "").not.toMatch(NOT_FOLLOWED);
      const img = link.getByRole("img", { name, exact: true });
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { message: `${name} loaded` }).toBe(true);
      const box = (await img.boundingBox())!;
      expect([box.width, box.height], `${name} box at ${width}px`).toEqual([w, h]);
      expect(box.x + box.width, `${name} past the viewport at ${width}px`).toBeLessThanOrEqual(width);
    }
    expect(requested.length, "both badge images fetched once scrolled to").toBeGreaterThanOrEqual(BADGES.length);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `page scrolls sideways at ${width}px`).toBe(true);
  });

  test(`home has no layout shift at ${width}px when scrolled to the footer and the badges load`, async ({ page }) => {
    await stubBadgeImages(page);
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!entry.hadRecentInput) w.__cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    for (const { name } of BADGES) {
      const img = badgeLink(page, name).getByRole("img", { name, exact: true });
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { message: `${name} loaded` }).toBe(true);
    }
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
  });
}

test("the badges' accessible names start with their alt text and say they open a new tab", async ({ page }) => {
  await stubBadgeImages(page);
  await page.goto("/");
  for (const { name } of BADGES) await expect(badgeLink(page, name)).toHaveAccessibleName(`${name} (opens in a new tab)`);
});
