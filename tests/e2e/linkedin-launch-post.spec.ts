import { expect, test } from "@playwright/test";
import { LINKEDIN_EXAMPLES, LINKEDIN_TEMPLATE } from "../../src/lib/linkedin-launch-examples";

const path = "/blog/linkedin-product-launch-post";

test("LinkedIn template and examples copy the displayed text exactly", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(path);
  const examples = [
    { id: "linkedin-template", label: "Copy post template", text: LINKEDIN_TEMPLATE },
    ...LINKEDIN_EXAMPLES.map((e) => ({ id: `linkedin-example-${e.id}`, label: `Copy ${e.name} example`, text: e.text })),
  ];
  for (const example of examples) {
    await expect(page.getByTestId(example.id)).toHaveText(example.text);
    const button = page.getByRole("button", { name: `${example.label} to clipboard`, exact: true });
    await button.click();
    await expect(button).toContainText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(example.text);
  }
});

test("LinkedIn examples show the actual counts and disclose their editorial origin", async ({ page }) => {
  await page.goto(path);
  for (const example of LINKEDIN_EXAMPLES) {
    const rendered = await page.getByTestId(`linkedin-example-${example.id}`).innerText();
    const count = Array.from(rendered.trim()).length;
    expect(count).toBeLessThanOrEqual(3000);
    await expect(page.getByTestId(`linkedin-count-${example.id}`)).toHaveText(`${count} characters, below the 3,000-character ceiling documented as of 11 November 2026.`);
  }
  await expect(page.locator("article > div").first()).toContainText("not published posts, statements by the maintainers or LaunchLoop kit outputs");
});

test("LinkedIn structures table is labelled, captioned and keyboard focusable at 375 px without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(path);
  const region = page.getByRole("region", { name: "LinkedIn launch post structures" });
  await expect(region).toHaveAttribute("tabindex", "0");
  await expect(region.locator("caption")).toHaveText("Editorial structures, not LinkedIn ranking rules");
  await expect(region.locator('th[scope="col"]')).toHaveCount(3);
  await expect(region.locator('th[scope="row"]')).toHaveCount(3);
  await region.focus();
  await expect(region).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const id of ["linkedin-template", ...LINKEDIN_EXAMPLES.map((e) => `linkedin-example-${e.id}`)]) {
    expect(await page.getByTestId(id).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});
