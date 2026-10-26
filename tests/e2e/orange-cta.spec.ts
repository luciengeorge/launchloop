import { expect, test, type Locator, type Page } from "@playwright/test";
import { kitErrorBody, rateLimitedBody } from "@/lib/errors";
import { EXAMPLE_KIT_PATH } from "@/lib/site";
import { contrast, makeSampleKit } from "./helpers";

// Own preview rate-limit bucket: the kit-page entries make sample kits.
test.use({ extraHTTPHeaders: { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250) + 1}` } });
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "ignoreErrors" }));

let sampleKit: string | undefined;
/** One sample kit for every kit-page entry, opened on its page (signed out, exp_paywall_early_cta off). */
async function openKit(page: Page) {
  sampleKit ??= await makeSampleKit(page);
  await page.goto(`/kit/${sampleKit}`);
  await expect(page.getByTestId("unlock-panel").getByRole("button", { name: "Unlock the full kit, £19" })).toBeEnabled();
}

/** The free-preview limit, as errors.spec.ts reaches it: the 429 is replayed, with the visitor's newest preview (`kitId`) or without. */
async function rateLimited(page: Page, kitId?: string) {
  await page.route("**/api/kits", (route) => route.fulfill({ status: 429, headers: { "Retry-After": "1380" }, json: { ...rateLimitedBody(1380), ...(kitId ? { kitId } : {}) } }));
  await page.goto("/");
  await page.getByLabel("GitHub repo or live site URL").fill("github.com/acme/app");
  await page.getByRole("button", { name: "Get my free preview" }).first().click();
  await expect(page.getByTestId("rate-limit-actions")).toBeVisible();
}

async function kitFormError(page: Page, code: "repo_not_found" | "site_no_content", input: string) {
  await page.route("**/api/kits", (route) => route.fulfill({ status: code === "repo_not_found" ? 404 : 422, json: kitErrorBody(code) }));
  await page.goto("/");
  await page.getByLabel("GitHub repo or live site URL").fill(input);
  await page.getByRole("button", { name: "Get my free preview" }).first().click();
  await expect(page.getByTestId("kit-error")).toHaveAttribute("data-code", code);
}

/** The panel's checkout failed with a plain-text 500 (no JSON): its friendly error with Try again is on screen. */
async function panelCheckoutError(page: Page) {
  await openKit(page);
  await page.route("**/api/checkout", (route, request) =>
    request.method() === "POST" ? route.fulfill({ status: 500, contentType: "text/plain", body: "Internal Server Error" }) : route.continue(),
  );
  await page.getByTestId("unlock-panel").getByRole("button", { name: "Unlock the full kit, £19" }).click();
  await expect(page.getByTestId("unlock-panel").getByRole("alert")).toBeVisible();
}

const darkBand = (page: Page) => page.locator("aside.bg-foreground, div.bg-foreground").getByRole("link", { name: "Get my free preview" });

/** Every filled orange call to action (and the checkout error's Try again), where it is, and how to get it on screen. */
const CTAS: { name: string; open: (page: Page) => Promise<unknown>; locate: (page: Page) => Locator }[] = [
  { name: "header CTA", open: (p) => p.goto("/"), locate: (p) => p.getByRole("banner").getByRole("link", { name: /Get (my )?(launch )?kit/ }) },
  { name: "hero kit button", open: (p) => p.goto("/"), locate: (p) => p.getByRole("form", { name: "Generate a launch kit" }).getByRole("button", { name: /Get my free preview/ }) },
  { name: "home closing band (dark)", open: (p) => p.goto("/"), locate: darkBand },
  { name: "footer Subscribe", open: (p) => p.goto("/"), locate: (p) => p.getByRole("contentinfo").getByRole("button", { name: "Subscribe" }) },
  { name: "pricing kit CTA", open: (p) => p.goto("/pricing"), locate: (p) => p.getByRole("main").getByRole("link", { name: /Get my launch kit/ }) },
  { name: "pricing featured badge", open: (p) => p.goto("/pricing"), locate: (p) => p.getByRole("main").getByText("Most people start here", { exact: true }) },
  { name: "PreviewCta (blog post)", open: (p) => p.goto("/blog/how-to-launch-on-product-hunt"), locate: (p) => p.getByRole("link", { name: "Get a free preview" }) },
  { name: "hub band (dark)", open: (p) => p.goto("/guides"), locate: darkBand },
  { name: "tagline tool band (dark)", open: (p) => p.goto("/tools/product-hunt-tagline-checker"), locate: darkBand },
  {
    name: "tagline tool submit",
    open: (p) => p.goto("/tools/product-hunt-tagline-checker").then(() => p.getByRole("tab", { name: "Generate from repo or URL" }).click()),
    locate: (p) => p.getByRole("button", { name: "Generate 3 taglines" }),
  },
  { name: "OG tool band (dark)", open: (p) => p.goto("/tools/og-preview"), locate: darkBand },
  { name: "OG tool submit", open: (p) => p.goto("/tools/og-preview"), locate: (p) => p.getByRole("button", { name: "Preview card" }) },
  // The Suspense fallback's form is in the DOM until the streamed one replaces it.
  { name: "login submit", open: (p) => p.goto("/login").then(() => expect(p.getByTestId("login-submit")).toHaveCount(1)), locate: (p) => p.getByTestId("login-submit") },
  { name: "Ship Loop hero", open: (p) => p.goto("/ship-loop"), locate: (p) => p.getByRole("main").getByRole("link", { name: "Join the waitlist" }).first() },
  { name: "Ship Loop waitlist submit", open: (p) => p.goto("/ship-loop"), locate: (p) => p.getByRole("button", { name: "Join the waitlist" }) },
  { name: "example kit: Brief stage tab", open: (p) => p.goto(EXAMPLE_KIT_PATH).then(() => p.getByTestId("stage-tab-Brief").click()), locate: (p) => p.getByTestId("stage-tab-Brief") },
  {
    name: "example kit: task CTA",
    open: (p) => p.goto(EXAMPLE_KIT_PATH).then(() => p.getByTestId("stage-tab-Brief").click()),
    locate: (p) => p.locator('[data-task-id="brief.review"]').getByTestId("task-cta").getByRole("link"),
  },
  { name: "kit: panel unlock button", open: openKit, locate: (p) => p.getByTestId("unlock-panel").getByRole("button", { name: "Unlock the full kit, £19" }) },
  { name: "kit: active unlock step", open: openKit, locate: (p) => p.getByTestId("unlock-panel").locator("li span.bg-primary").first() },
  {
    name: "kit: Continue to checkout",
    open: (p) => openKit(p).then(() => p.getByTestId("unlock-login-first").click()),
    locate: (p) => p.getByTestId("unlock-panel").getByRole("button", { name: "Continue to checkout" }),
  },
  { name: "kit: panel unlock button after a failed checkout", open: panelCheckoutError, locate: (p) => p.getByTestId("unlock-panel").getByRole("button", { name: "Unlock the full kit, £19" }) },
  // Outline, not orange: measured because it's the way on from a failed checkout.
  { name: "kit: checkout error Try again (outline)", open: panelCheckoutError, locate: (p) => p.getByTestId("unlock-panel").getByRole("alert").getByRole("button", { name: "Try again" }) },
  { name: "not-found page CTA", open: (p) => p.goto("/nonexistent"), locate: (p) => p.getByRole("main").getByRole("link", { name: "Get my free preview" }) },
  { name: "rate limit: See the Launch Kit", open: (p) => rateLimited(p), locate: (p) => p.getByTestId("rate-limit-pricing") },
  { name: "rate limit: Unlock my kit", open: (p) => rateLimited(p, "kit_limitedPreview01"), locate: (p) => p.getByTestId("rate-limit-unlock") },
  { name: "error: Try your site URL instead", open: (p) => kitFormError(p, "repo_not_found", "github.com/real-owner/secret-repo"), locate: (p) => p.getByTestId("kit-site-cta") },
  { name: "error: Use my GitHub repo instead", open: (p) => kitFormError(p, "site_no_content", "https://acme.io"), locate: (p) => p.getByTestId("kit-repo-cta") },
];

/**
 * Elements painted the brand orange (or its hover) with white or near-white text in them, read from computed styles:
 * catches text-white, text-background or a white token on orange, whatever the class is called.
 */
const whiteOnOrange = (page: Page) =>
  page.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    const luminance = (...colors: string[]) => {
      for (const color of ["#fff", ...colors]) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
      }
      const [r, g, b] = [...ctx.getImageData(0, 0, 1, 1).data].map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const oranges = ["bg-primary", "bg-primary-hover"]
      .map((cls) => {
        const probe = document.createElement("div");
        probe.className = cls;
        document.body.append(probe);
        const color = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return color;
      })
      .filter((color) => color !== "rgba(0, 0, 0, 0)");
    const offenders: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const fill = getComputedStyle(el).backgroundColor;
      if (!oranges.includes(fill) || !el.checkVisibility()) continue;
      for (const node of [el, ...el.querySelectorAll<HTMLElement>("*")]) {
        const hasText = [...node.childNodes].some((c) => c.nodeType === Node.TEXT_NODE && c.textContent!.trim());
        if (hasText && luminance(fill, getComputedStyle(node).color) > 0.5) offenders.push(`${node.textContent!.trim().slice(0, 40)} [${node.className}]`);
      }
    }
    return { oranges, offenders };
  });

for (const cta of CTAS) {
  test(`${cta.name}: label at least 4.5:1 at rest and hovered; no white text on orange on the page`, async ({ page }, { project }) => {
    await cta.open(page);
    const target = cta.locate(page);
    await expect(target).toBeVisible();
    await target.scrollIntoViewIfNeeded();
    const guard = await whiteOnOrange(page);
    expect(guard.oranges.length).toBeGreaterThan(0);
    expect(guard.offenders, "white text on orange").toEqual([]);
    if ((await target.isDisabled()) || (await target.getAttribute("aria-disabled")) === "true") test.skip(true, "disabled controls are exempt");

    // Off the target (opening the page may have clicked it) and past its transition, so "rest" isn't half hovered.
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    const rest = await contrast(target);
    expect(rest, cta.name).toBeGreaterThanOrEqual(4.5);
    await target.hover();
    await page.waitForTimeout(300);
    // Again while hovered, so a hover:text-white (or a white label on --primary-hover) is caught too.
    expect((await whiteOnOrange(page)).offenders, "white text on orange (hovered)").toEqual([]);
    const hovered = await contrast(target);
    expect(hovered, `${cta.name} (hovered)`).toBeGreaterThanOrEqual(4.5);
    await page.mouse.move(0, 0);
    console.log(`contrast [${project.name}] ${cta.name}: ${rest.toFixed(2)} at rest, ${hovered.toFixed(2)} hovered`);
  });
}

test.describe("JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("/login/verify: the <noscript> Log in button has a dark label at least 4.5:1, and no white text on orange", async ({ page }, { project }) => {
    await page.goto("/login/verify");
    const button = page.getByRole("button", { name: "Log in" });
    await expect(button).toBeVisible();
    const rest = await contrast(button);
    expect(rest).toBeGreaterThanOrEqual(4.5);
    expect((await whiteOnOrange(page)).offenders).toEqual([]);
    console.log(`contrast [${project.name}] verify noscript Log in: ${rest.toFixed(2)} at rest (no hover style)`);
  });
});
