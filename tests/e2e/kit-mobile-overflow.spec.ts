import { expect, test, type Page } from "@playwright/test";

const ip = () => ({ "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 20}` });

test.use({ viewport: { width: 375, height: 812 } });

/** Elements whose right edge passes the viewport, for a readable failure message. */
const overflowing = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5)
      .map((el) => `${el.tagName.toLowerCase()}${el.dataset.testid ? `[${el.dataset.testid}]` : ""} ${Math.round(el.getBoundingClientRect().right)}px: ${(el.textContent ?? "").trim().slice(0, 40)}`)
      .slice(0, 10),
  );

test("a kit with long repo stats fits a 375px screen without sideways scrolling", async ({ page, request }) => {
  const res = await request.post("/api/kits", { data: { url: "https://github.com/fixture-labs/ms" }, headers: ip() });
  expect(res.status()).toBe(201);
  const { url } = (await res.json()) as { url: string };

  await page.goto(url);
  const stars = page.getByTestId("source-chip").filter({ hasText: "1234567 stars" });
  await expect(stars).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brand colours (defaults)" })).toBeVisible();

  const widths = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(await overflowing(page), "elements past the right edge").toEqual([]);
  expect(widths.doc).toBeLessThanOrEqual(375);
  expect(widths.body).toBeLessThanOrEqual(375);

  // Nothing was hidden to get there: the stars chip, the long "Latest ship" stat and every palette swatch are inside the viewport.
  const latest = page.getByText("Latest ship: Support parse_human_readable_duration_strings_with_fractional_units");
  await expect(latest).toBeVisible();
  for (const el of [stars, latest]) {
    const box = await el.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  }
  const swatches = page.getByRole("list", { name: "Palette" }).getByRole("listitem");
  await expect(swatches).toHaveCount(4);
  for (const box of await Promise.all((await swatches.all()).map((s) => s.boundingBox()))) expect(box!.x + box!.width).toBeLessThanOrEqual(375);
});
