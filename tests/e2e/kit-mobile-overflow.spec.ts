import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ip = () => ({ "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 20}` });

test.use({ viewport: { width: 375, height: 812 } });

/**
 * Elements that break a 375px layout, for a readable failure message: anything past the right or left edge of the
 * viewport, and anything in the page's <main> whose content is wider than its own box (scrollWidth > clientWidth).
 * Exceptions: containers meant to scroll sideways (overflow-x: auto or scroll) and screen-reader-only text (1px).
 * The width check skips the site header, whose menu button bleeds 6px into the header's padding on purpose.
 */
const overflowing = (page: Page) =>
  page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const main = document.querySelector("main");
    const describe = (el: Element, why: string) => {
      const box = el.getBoundingClientRect();
      const testid = el instanceof HTMLElement && el.dataset.testid ? `[${el.dataset.testid}]` : "";
      return `${el.tagName.toLowerCase()}${testid} ${why} (left ${Math.round(box.left)}, right ${Math.round(box.right)}, scroll ${el.scrollWidth} > client ${el.clientWidth}): ${(el.textContent ?? "").trim().slice(0, 40)}`;
    };
    const found: string[] = [];
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const box = el.getBoundingClientRect();
      if (box.width <= 1 && box.height <= 1) continue;
      if (box.right > viewport + 0.5) found.push(describe(el, "past the right edge"));
      else if (box.left < -0.5) found.push(describe(el, "past the left edge"));
      else if (main?.contains(el) && el.scrollWidth > el.clientWidth + 1 && !["auto", "scroll"].includes(style.overflowX)) found.push(describe(el, "content wider than its box"));
    }
    return found.slice(0, 10);
  });

async function expectFits(page: Page) {
  expect(await overflowing(page), "elements that overflow").toEqual([]);
  const widths = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(widths.doc).toBeLessThanOrEqual(375);
  expect(widths.body).toBeLessThanOrEqual(375);
}

async function createKit(request: APIRequestContext, repo: string): Promise<{ id: string; url: string }> {
  const res = await request.post("/api/kits", { data: { url: repo }, headers: ip() });
  expect(res.status()).toBe(201);
  return (await res.json()) as { id: string; url: string };
}

test("a kit with long repo stats fits a 375px screen without sideways scrolling", async ({ page, request }) => {
  const { url } = await createKit(request, "https://github.com/fixture-labs/ms");
  await page.goto(url);
  const stars = page.getByTestId("source-chip").filter({ hasText: "1234567 stars" });
  await expect(stars).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brand colours (defaults)" })).toBeVisible();
  await expectFits(page);

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

test("a 60-character unbroken kit name wraps at 375px", async ({ page, request }) => {
  const { id, url } = await createKit(request, "https://github.com/fixture-labs/ms");
  // Briefs cap names at 30 characters, so the stored kit (the e2e server's file store, DATA_DIR=.data-test) is edited directly.
  const name = "Supercalifragilisticexpialidocious_millisecond_converter_pro";
  expect(name).toHaveLength(60);
  const file = path.resolve(".data-test", `dev_kit_${id}.json`);
  const record = JSON.parse(readFileSync(file, "utf8")) as { value: { brief: { name: string } } };
  record.value.brief.name = name;
  writeFileSync(file, JSON.stringify(record));

  await page.goto(url);
  const heading = page.getByRole("heading", { level: 1, name });
  await expect(heading).toBeVisible();
  await expectFits(page);
  const box = await heading.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
});
