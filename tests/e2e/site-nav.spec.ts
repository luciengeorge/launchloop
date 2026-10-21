import { expect, test, type Page } from "@playwright/test";

/** The header's height on main before the Blog link and mobile menu: the 56 px row plus its 1 px border, at every width. */
const HEADER_HEIGHT = 57;
const WIDTHS = [320, 375, 768, 1024, 1280, 1920];

/** The readable session hint is all the header reads to show its signed-in links (see HeaderAuth). */
async function signedInHeader(page: Page, baseURL: string) {
  await page.context().addCookies([{ name: "ll_auth", value: "1", url: baseURL }]);
}

const headerHeight = async (page: Page) => (await page.getByRole("banner").boundingBox())!.height;

/** Waits until the header shows the variant's account link, i.e. after HeaderAuth has read the session hint. */
const authLink = (page: Page, signedIn: boolean) =>
  signedIn ? page.getByRole("banner").getByRole("button", { name: "Log out" }) : page.getByRole("banner").getByRole("link", { name: "Log in" });

test("Blog is in the desktop nav and the footer, and the nav link opens /blog", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const nav = page.getByRole("banner").getByRole("navigation", { name: "Main" });
  const blog = nav.getByRole("link", { name: "Blog", exact: true });
  await expect(blog).toBeVisible();
  await expect(blog).toHaveAttribute("href", "/blog");
  await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeHidden();

  const footerBlog = page.getByRole("contentinfo").getByRole("link", { name: "Blog", exact: true });
  await expect(footerBlog).toBeVisible();
  await expect(footerBlog).toHaveAttribute("href", "/blog");

  await blog.click();
  await page.waitForURL((u) => u.pathname === "/blog");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("Blog is in the mobile menu at 375px, and opening the menu doesn't change the header", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const banner = page.getByRole("banner");
  const toggle = banner.getByRole("button", { name: "Menu" });
  const blog = banner.getByRole("link", { name: "Blog", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(blog).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(`[id="${await toggle.getAttribute("aria-controls")}"]`)).toBeVisible();
  await expect(blog).toBeVisible();
  await expect(blog).toHaveAttribute("href", "/blog");
  expect(await headerHeight(page)).toBe(HEADER_HEIGHT);

  await page.keyboard.press("Escape");
  await expect(blog).toBeHidden();
  await expect(toggle).toBeFocused();

  await toggle.click();
  await blog.click();
  await page.waitForURL((u) => u.pathname === "/blog");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  const footerBlog = page.getByRole("contentinfo").getByRole("link", { name: "Blog", exact: true });
  await expect(footerBlog).toBeVisible();
  await expect(footerBlog).toHaveAttribute("href", "/blog");
});

test("the mobile menu closes when focus leaves it, either way", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const banner = page.getByRole("banner");
  const toggle = banner.getByRole("button", { name: "Menu" });
  const faq = banner.getByRole("link", { name: "FAQ", exact: true });

  // Tab through every link, then past the last one.
  await toggle.click();
  await expect(toggle).toBeFocused();
  for (let i = 0; i < 7; i++) await page.keyboard.press("Tab");
  await expect(faq).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(faq).toBeHidden();

  // Shift+Tab off the button, back to the CTA.
  await toggle.click();
  await expect(faq).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(banner.locator("a[data-plan=kit]")).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("the menu button's hit area is at least 44 by 44 inside the 57px header", async ({ page }) => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/");
    const box = (await page.getByRole("banner").getByRole("button", { name: "Menu" }).boundingBox())!;
    expect(box.width, `menu button width at ${width}px`).toBeGreaterThanOrEqual(44);
    expect(box.height, `menu button height at ${width}px`).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width, `menu button past the viewport at ${width}px`).toBeLessThanOrEqual(width);
    expect(await headerHeight(page)).toBe(HEADER_HEIGHT);
  }
});

for (const signedIn of [false, true]) {
  test(`header links' accessible names start with their visible text (voice control), ${signedIn ? "signed in" : "signed out"}`, async ({ page, baseURL }) => {
    if (signedIn) await signedInHeader(page, baseURL!);
    for (const width of [375, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(authLink(page, signedIn)).toBeVisible();
      const controls = page.getByRole("banner").locator("a:visible, button:visible");
      for (let i = 0; i < (await controls.count()); i++) {
        const control = controls.nth(i);
        // Rendered text only: no sr-only spans, nothing display: none. The Soon badge is extra to the label, not part of it.
        const visible = await control.evaluate((el) => {
          const parts: string[] = [];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const parent = n.parentElement!;
            const box = parent.getBoundingClientRect();
            // sr-only (at any breakpoint) leaves a 1px box; display: none leaves none.
            if (parent.closest("[data-slot=badge]") || box.width <= 1 || box.height <= 1) continue;
            parts.push(n.textContent!);
          }
          return parts.join("").replace(/\s+/g, " ").trim();
        });
        if (!visible) continue;
        const escaped = visible.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        await expect(control, `"${visible}" at ${width}px`).toHaveAccessibleName(new RegExp(`^${escaped}`));
      }
    }
  });
}

for (const signedIn of [false, true]) {
  test(`header (${signedIn ? "signed in" : "signed out"}): same height as before, no wrapping or overflow, Blog reachable at every width`, async ({ page, baseURL }) => {
    if (signedIn) await signedInHeader(page, baseURL!);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const banner = page.getByRole("banner");
      await expect(authLink(page, signedIn)).toBeVisible();
      if (width >= 768) await expect(banner.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Blog", exact: true })).toBeVisible();
      else await expect(banner.getByRole("button", { name: "Menu" })).toBeVisible();

      expect(await headerHeight(page), `header height at ${width}px`).toBe(HEADER_HEIGHT);
      const layout = await page.evaluate(() => {
        const header = document.querySelector("header")!;
        const row = header.firstElementChild!;
        const wrapped: string[] = [];
        let right = 0;
        for (const el of header.querySelectorAll("a, button")) {
          const box = el.getBoundingClientRect();
          if (!box.width) continue;
          right = Math.max(right, box.right);
          // A link wraps when one of its visible text line boxes starts below another's bottom.
          const rects: DOMRect[] = [];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const box = n.parentElement!.getBoundingClientRect();
            if (!n.textContent!.trim() || box.width <= 1 || box.height <= 1) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            rects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
          }
          if (rects.some((a) => rects.some((b) => b.top >= a.bottom - 1))) wrapped.push(el.textContent!.trim());
        }
        return { wrapped, right, rowFits: row.scrollWidth <= row.clientWidth, docFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth, vw: document.documentElement.clientWidth };
      });
      expect(layout.wrapped, `header links wrap at ${width}px`).toEqual([]);
      expect(layout.rowFits, `header row overflows at ${width}px`).toBe(true);
      expect(layout.docFits, `page scrolls sideways at ${width}px`).toBe(true);
      expect(layout.right, `header item past the viewport at ${width}px`).toBeLessThanOrEqual(layout.vw);
    }
  });
}

for (const signedIn of [false, true]) {
  for (const width of [375, 1280]) {
    test(`home has no layout shift at ${width}px, ${signedIn ? "signed in" : "signed out"}`, async ({ page, baseURL }) => {
      if (signedIn) await signedInHeader(page, baseURL!);
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number };
        w.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!entry.hadRecentInput) w.__cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "load" });
      await expect(authLink(page, signedIn)).toBeVisible();
      await page.waitForTimeout(1000);
      expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
    });
  }
}
