import { expect, test, type Page } from "@playwright/test";
import { makeSampleKit } from "./helpers";
import { EXAMPLE_KIT } from "../../src/lib/example-kit";
import { buildTasks } from "../../src/lib/tasks";

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


async function prepareFinalChecklistTask(page: Page) {
  await page.clock.install({ time: new Date("2026-11-11T12:00:00Z") });
  const tasks = buildTasks({ content: EXAMPLE_KIT.content!, checklist: EXAMPLE_KIT.checklist!, locked: false, brief: EXAMPLE_KIT.brief, example: true });
  await page.addInitScript(({ kitId, done }) => {
    const key = `launchloop:progress:${kitId}`;
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(done));
    const w = window as unknown as { confettiBursts: number };
    w.confettiBursts = 0;
    const seen = new WeakSet<Element>();
    new MutationObserver(() => {
      for (const burst of document.querySelectorAll('[data-testid="confetti"]')) {
        if (seen.has(burst)) continue;
        seen.add(burst);
        w.confettiBursts++;
        // Pause only the test burst so its short lifetime can be inspected deterministically.
        burst.getAnimations({ subtree: true }).forEach((animation) => animation.pause());
      }
    }).observe(document, { childList: true, subtree: true });
  }, { kitId: EXAMPLE_KIT.id, done: tasks.filter((task) => task.id !== "brief.review").map((task) => task.id) });
  await page.goto("/example-kit");
  await expect(page.getByTestId("progress")).not.toHaveAttribute("aria-valuenow", "0");
  await page.clock.pauseAt(new Date("2026-11-11T12:01:00Z"));
}

const burstCount = (page: Page) => page.evaluate(() => (window as unknown as { confettiBursts: number }).confettiBursts);
async function completeAgain(page: Page) {
  await page.getByTestId("stage-tab-Brief").click();
  const toggle = page.locator('[data-task-id="brief.review"]').getByTestId("mark-done");
  await toggle.click();
  await expect(toggle).toHaveText("Mark done");
  await toggle.click();
  await expect(page.getByTestId("all-done")).toBeVisible();
}

test("completion confetti fires once, never loops, and does not replay on re-render or session revisit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await prepareFinalChecklistTask(page);
  await expect(page.getByTestId("confetti")).toHaveCount(0);
  await page.getByTestId("mark-done").first().click();
  const burst = page.getByTestId("confetti");
  await expect(burst).toHaveCount(1);
  expect(await burstCount(page)).toBe(1);
  const timing = await burst.evaluate((el) => el.getAnimations({ subtree: true }).map((animation) => {
    const effect = animation.effect as KeyframeEffect;
    const { duration, iterations } = effect.getTiming();
    const easing = getComputedStyle(effect.target as Element).animationTimingFunction;
    return { duration, iterations, easing, state: animation.playState };
  }));
  expect(timing).toHaveLength(12);
  expect(timing.every((t) => t.duration === 200 && t.iterations === 1 && t.easing === "ease-out" && t.state === "paused")).toBe(true);
  await expectMotionBudget(page, false);
  await page.getByTestId("stage-tab-X").click();
  expect(await burstCount(page)).toBe(1);
  await page.clock.fastForward(250);
  await expect(burst).toHaveCount(0);
  await completeAgain(page);
  expect(await burstCount(page)).toBe(1);
  await expect(burst).toHaveCount(0);
  await page.goto("/pricing");
  await page.goto("/example-kit");
  await expect(page.getByTestId("progress")).toHaveAttribute("aria-valuenow", "100");
  await expect(burst).toHaveCount(0);
  await completeAgain(page);
  expect(await burstCount(page)).toBe(0);
});

test("completion confetti renders nothing under reduced motion and cannot replay when motion is re-enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepareFinalChecklistTask(page);
  await page.getByTestId("mark-done").first().click();
  await expect(page.getByTestId("all-done")).toBeVisible();
  await expect(page.getByTestId("confetti")).toHaveCount(0);
  expect(await burstCount(page)).toBe(0);
  await expectMotionBudget(page, true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await completeAgain(page);
  await expect(page.getByTestId("confetti")).toHaveCount(0);
  expect(await burstCount(page)).toBe(0);
});

test("a live reduced-motion change removes an active confetti burst and it never resumes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await prepareFinalChecklistTask(page);
  await page.getByTestId("mark-done").first().click();
  await expect(page.getByTestId("confetti")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("confetti")).toHaveCount(0);
  await expectMotionBudget(page, true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await completeAgain(page);
  await expect(page.getByTestId("confetti")).toHaveCount(0);
  expect(await burstCount(page)).toBe(1);
});
