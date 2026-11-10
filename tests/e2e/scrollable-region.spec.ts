import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  { path: "/tools/og-preview", testId: "og-tags-example" },
  { path: "/blog/og-image-size", testId: "og-size-tags" },
];

const unfocusableRegions = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withRules(["scrollable-region-focusable"]).analyze();
  return violations.flatMap((v) => v.nodes.map((node) => node.target.join(" ")));
};

for (const { path, testId } of PAGES) {
  test(`${path}: the overflowing tags <pre> is a named region you can tab to, and axe scrollable-region-focusable is clean`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(path);
    const pre = page.getByTestId(testId);
    await expect(pre).toBeVisible();
    expect(await pre.evaluate((el) => el.scrollWidth > el.clientWidth), "the <pre> scrolls sideways at 375 px").toBe(true);

    expect.soft(await unfocusableRegions(page)).toEqual([]);
    await expect.soft(pre).toHaveAttribute("tabindex", "0");
    await expect.soft(pre).toHaveAttribute("role", "region");
    await expect.soft(pre).toHaveAttribute("aria-label", /\S/);
    await pre.focus();
    await expect(pre).toBeFocused();
  });
}

// The OG preview tool's <pre> is capped at max-w-3xl, so it overflows at every width; the blog post's fits on a wide screen.
test("/blog/og-image-size: axe scrollable-region-focusable stays clean when the tags <pre> doesn't overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/blog/og-image-size");
  const pre = page.getByTestId("og-size-tags");
  await expect(pre).toBeVisible();
  expect(await pre.evaluate((el) => el.scrollWidth <= el.clientWidth), "the <pre> fits at 1440 px").toBe(true);
  expect(await unfocusableRegions(page)).toEqual([]);
});
