import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const mismatches = async (page: Page, path: string) => {
  const { violations } = await new AxeBuilder({ page }).withRules(["label-content-name-mismatch"]).analyze();
  return violations.flatMap((v) => v.nodes.map((node) => `${path}: ${node.target.join(" ")} ${node.failureSummary ?? ""}`.trim()));
};

test("axe label-content-name-mismatch is clean on every sitemap page", async ({ page, request }) => {
  test.setTimeout(300_000);
  const xml = await (await request.get("/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  expect(paths.length).toBeGreaterThan(10);
  const found: string[] = [];
  for (const path of paths) {
    await page.goto(path);
    found.push(...(await mismatches(page, path)));
  }
  expect(found).toEqual([]);
});

test("axe label-content-name-mismatch is clean in the open mobile menu", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const toggle = page.getByRole("banner").getByRole("button", { name: "Menu" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(await mismatches(page, "/ (mobile menu)")).toEqual([]);
});

test("the Ship Loop nav item's accessible name contains its visible text, on desktop and in the mobile menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" }).locator('a[href="/ship-loop"]')).toHaveAccessibleName(/ship loop soon/i);

  await page.setViewportSize({ width: 375, height: 812 });
  const toggle = page.getByRole("banner").getByRole("button", { name: "Menu" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const mobile = page.locator(`[id="${await toggle.getAttribute("aria-controls")}"]`).locator('a[href="/ship-loop"]');
  await expect(mobile).toHaveText(/Ship Loop\s*Soon/);
  await expect(mobile).toHaveAccessibleName(/ship loop soon/i);
});
