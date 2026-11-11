import { expect, test, type Page } from "@playwright/test";
import { makeSampleKit } from "./helpers";

// Own preview rate-limit bucket. Both narrow and wide layouts run in this spec.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "192.0.2.251" } });

async function expectMotionBudget(page: Page, reduced: boolean) {
  const violations = await page.evaluate((reduce) => {
    const failures: string[] = [];
    for (const el of document.querySelectorAll("*")) {
      for (const pseudo of [null, "::before", "::after"]) {
        const style = getComputedStyle(el, pseudo);
        const durations = style.transitionDuration.split(",").map(parseFloat);
        const properties = style.transitionProperty.split(",").map((p) => p.trim());
        for (let i = 0; i < properties.length; i++) {
          const duration = durations[i % durations.length];
          if (duration === 0) continue;
          if (reduce || duration > 0.25 || !["transform", "opacity"].includes(properties[i])) {
            failures.push(`${el.tagName}.${el.getAttribute("class")} ${pseudo ?? ""}: ${properties[i]} ${duration}s`);
          }
        }
        if (reduce && style.animationDuration.split(",").some((d) => parseFloat(d) > 0)) {
          failures.push(`${el.tagName}: animation ${style.animationName}`);
        }
      }
    }
    for (const animation of document.getAnimations()) {
      const frames = (animation.effect as KeyframeEffect).getKeyframes();
      const allowed = ["transform", "opacity", "offset", "computedOffset", "easing", "composite"];
      for (const frame of frames) {
        for (const property of Object.keys(frame)) {
          if (!allowed.includes(property)) failures.push(`animated property: ${property}`);
        }
      }
    }
    return failures;
  }, reduced);
  expect(violations).toEqual([]);
}

for (const reduced of [false, true]) {
  test.describe(reduced ? "reduced motion" : "standard motion", () => {
    test.use({ reducedMotion: reduced ? "reduce" : "no-preference" });

    for (const route of ["/", "/pricing", "/example-kit", "/blog/linkedin-product-launch-post"]) {
      test(`${route}: only short compositor transitions, or no motion when reduced`, async ({ page }) => {
        for (const width of [390, 1280]) {
          await page.setViewportSize({ width, height: 844 });
          await page.goto(route);
          await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
          await expectMotionBudget(page, reduced);
        }
      });
    }

    test("FAQ and checklist changes stay usable without layout animation", async ({ page }) => {
      await page.goto("/");
      const faq = page.locator('[data-slot="accordion-trigger"]').first();
      await faq.click();
      await expect(faq).toHaveAttribute("aria-expanded", "true");
      const panel = page.locator('[data-slot="accordion-content"]').first();
      await expect(panel).toBeVisible();
      expect(await panel.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
      await faq.click();
      await expect(faq).toHaveAttribute("aria-expanded", "false");
      await expect(panel).toBeHidden();

      await page.goto("/example-kit");
      const progress = page.getByTestId("progress");
      const before = Number(await progress.getAttribute("aria-valuenow"));
      const mark = page.getByTestId("mark-done").first();
      await mark.click();
      await expect.poll(async () => Number(await progress.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
      expect(await progress.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
      await expectMotionBudget(page, reduced);
    });

    test("preview checkout and mobile sticky bar respect the same motion budget", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 688 });
      const kitId = await makeSampleKit(page);
      await page.request.post("http://127.0.0.1:3419/ph/_flags", {
        data: { distinctId: `kit:${kitId}`, flags: { exp_paywall_early_cta: true } },
      });
      await page.goto(`/kit/${kitId}`);
      const early = page.getByTestId("early-unlock-cta");
      await expect(early).toBeVisible();
      await expectMotionBudget(page, reduced);
      await page.getByTestId("paywall-locked-sections").getByRole("listitem").nth(4).evaluate((el) => el.scrollIntoView({ block: "center" }));
      const sticky = page.getByTestId("sticky-unlock-bar");
      await expect(sticky).toHaveAttribute("data-visible", "true");
      await expect(sticky.getByRole("button")).toBeInViewport();
      await expectMotionBudget(page, reduced);

      // Hold checkout to inspect the existing busy icon without contacting a payment service.
      let release!: () => void;
      const pending = new Promise<void>((resolve) => (release = resolve));
      await page.route("**/api/checkout", async (route) => {
        await pending;
        await route.fulfill({ status: 502, json: { error: "Test checkout unavailable" } });
      });
      try {
        await sticky.getByRole("button").click();
        const spinner = sticky.locator(".animate-spin");
        await expect(spinner).toBeVisible();
        const duration = await spinner.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
        expect(duration).toBe(reduced ? 0 : 1);
        await expectMotionBudget(page, reduced);
      } finally {
        release();
      }
      await expect(sticky.getByRole("alert")).toBeVisible();
      await expectMotionBudget(page, reduced);
    });
  });
}

test("reduced motion also applies when the preference changes on an open page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Get my free preview", exact: true }).first();
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  await expectMotionBudget(page, true);
  await page.mouse.up();
});
