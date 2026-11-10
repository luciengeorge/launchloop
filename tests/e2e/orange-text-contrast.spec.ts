import { expect, test, type Locator, type Page } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KitPromoNote } from "@/components/kit-price";
import { UnlockPanel } from "@/components/kit/unlock-panel";
import { EXAMPLE_KIT_PATH } from "@/lib/site";
import { contrast, makeSampleKit, setHeroHeadline, uniqueEmail } from "./helpers";

const HERO_URL = "http://127.0.0.1:3420";
const SAMPLE_CTA_FLAG = "exp_hero_sample_cta";
/** main's --primary, --primary-hover and --primary-foreground (oklch(0.64 0.21 37), oklch(0.68 0.18 37), oklch(0.145 0 0)) as the CSS build emits them. */
const MAIN_CTA_TOKENS = ["lab(56.4149% 62.4398 65.6926)", "lab(61.3761% 52.745 50.01)", "lab(2.75381% 0 0)"];

test.use({ extraHTTPHeaders: { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250) + 1}` } });
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "ignoreErrors" }));

/** The live promo can't be switched on (LAUNCH_PROMO_ENDS_AT has passed), so its real markup is put where the page renders it. */
async function insertPromoMarkup(page: Page, anchor: Locator, html: string, testId: string) {
  await anchor.evaluate(
    (el, { html, testId }) => {
      const template = document.createElement("template");
      template.innerHTML = html;
      el.after(template.content.querySelector(`[data-testid="${testId}"]`)!);
    },
    { html, testId },
  );
  return page.getByTestId(testId).locator("span.font-mono");
}

/** Markup put in before React hydrates the hero is thrown away with it; the FAQ accordion only opens once hydrated. */
async function openHydratedHome(page: Page) {
  await page.goto("/");
  const faq = page.getByRole("button", { name: /^What do I get for/ });
  await expect(async () => {
    if ((await faq.getAttribute("aria-expanded")) !== "true") await faq.click();
    await expect(faq).toHaveAttribute("aria-expanded", "true", { timeout: 500 });
  }).toPass();
}

async function forceSampleCtaTest(page: Page) {
  await page.route(/\/lp-relay\/flags/, (route) =>
    route.fulfill({ json: { flags: { [SAMPLE_CTA_FLAG]: { key: SAMPLE_CTA_FLAG, enabled: true, variant: "test", reason: null, metadata: {} } }, errorsWhileComputingFlags: false } }),
  );
  await page.goto("/");
  await expect(page.locator("#start").getByRole("button", { name: "Try a sample app" })).toHaveAttribute("data-variant", "test");
}

let sampleKit: string | undefined;
async function openSampleKit(page: Page) {
  sampleKit ??= await makeSampleKit(page);
  await page.goto(`/kit/${sampleKit}`);
  await expect(page.getByTestId("unlock-panel").getByRole("button", { name: "Unlock the full kit, £19" })).toBeEnabled();
}

let successUrl: string | undefined;
async function openGuestSuccess(page: Page) {
  if (!successUrl) {
    await page.goto(`/kit/${await makeSampleKit(page)}`);
    await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
    await page.waitForURL(/\/checkout\/mock/);
    await page.getByLabel("Email for your receipt and kit").fill(uniqueEmail("orange-text"));
    await page.getByRole("button", { name: "Pay £19 (test mode)" }).click();
    await page.waitForURL(/\/checkout\/success\?/);
    successUrl = page.url();
  }
  await page.goto(successUrl);
}

type OrangeText = { at: string; what: string; open: (page: Page) => Promise<unknown>; locate: (page: Page) => Locator | Promise<Locator>; hover?: "only" | "also" };

/** Every orange text use in src (text-primary, hover:text-primary and the color-mix tint), and the page it's on. */
const ORANGE_TEXT: OrangeText[] = [
  { at: "src/app/page.tsx:63", what: "home hero accent", open: (p) => p.goto("/"), locate: (p) => p.getByRole("heading", { level: 1 }).getByText("Get your whole launch.") },
  { at: "src/app/page.tsx:81", what: "home 'See what's in the kit' link", open: (p) => p.goto("/"), locate: (p) => p.getByRole("link", { name: /^See what's in the/ }), hover: "only" },
  { at: "src/app/page.tsx:86", what: "home tagline checker link", open: (p) => p.goto("/"), locate: (p) => p.getByRole("link", { name: "Try the free tagline checker" }), hover: "only" },
  { at: "src/app/page.tsx:90", what: "home OG preview link", open: (p) => p.goto("/"), locate: (p) => p.getByRole("link", { name: "preview your link card" }), hover: "only" },
  { at: "src/app/page.tsx:102", what: "home 'The Launch Kit' eyebrow", open: (p) => p.goto("/"), locate: (p) => p.getByText("The Launch Kit", { exact: true }) },
  { at: "src/app/page.tsx:132", what: "home step number", open: (p) => p.goto("/"), locate: (p) => p.getByRole("region", { name: "How it works" }).getByText("01", { exact: true }) },
  { at: "src/app/page.tsx:182", what: "home 'Read all FAQs' link", open: (p) => p.goto("/"), locate: (p) => p.getByRole("link", { name: "Read all FAQs" }), hover: "only" },
  { at: "src/components/home-hero.tsx:70", what: "hero sample CTA, control arm", open: (p) => p.goto("/"), locate: (p) => p.locator("#start").getByRole("button", { name: "Try a sample app" }), hover: "only" },
  { at: "src/components/home-hero.tsx:74", what: "hero sample CTA, test arm", open: forceSampleCtaTest, locate: (p) => p.locator("#start").getByRole("button", { name: "Try a sample app" }), hover: "also" },
  { at: "src/components/home-hero.tsx:89", what: "hero 'See an example kit', test arm", open: forceSampleCtaTest, locate: (p) => p.getByTestId("example-kit-link"), hover: "only" },
  { at: "src/components/home-hero.tsx:65", what: "pricing sample CTA (no experiment)", open: (p) => p.goto("/pricing"), locate: (p) => p.getByRole("button", { name: "Try a sample app" }), hover: "only" },
  {
    at: "src/components/hero-headline.tsx:35",
    what: "hero experiment headline accent",
    open: (p) => setHeroHeadline(p.request, null).then(() => p.goto(HERO_URL)),
    locate: async (p) => {
      await expect(p.locator("[data-hero-pending]")).toHaveCount(0);
      await expect(p.getByRole("heading", { level: 1 })).toHaveCount(1);
      return p.locator("h1[data-hero-ready]").getByText("Get your whole launch.");
    },
  },
  {
    at: "src/components/kit-price.tsx:60",
    what: "home LAUNCH14 note code",
    open: openHydratedHome,
    locate: (p) => insertPromoMarkup(p, p.locator("#start p", { hasText: "Free preview, no account needed" }), renderToStaticMarkup(createElement(KitPromoNote, { promo: true })), "launch-promo-note"),
  },
  {
    at: "src/components/newsletter-form.tsx:200",
    what: "footer signup's link to the checklist",
    open: async (p) => {
      await p.goto("/");
      const footer = p.getByRole("contentinfo");
      await footer.getByLabel("Weekly launch teardowns").fill(uniqueEmail("orange-text"));
      await footer.getByRole("button", { name: "Subscribe" }).click();
      await expect(footer.getByRole("status")).toHaveAttribute("data-welcome", "sent");
    },
    locate: (p) => p.getByRole("contentinfo").getByRole("status").getByRole("link"),
    hover: "only",
  },
  { at: "src/components/hub-page.tsx:56", what: "guides hub card title", open: (p) => p.goto("/guides"), locate: (p) => p.locator("article h2 a").first(), hover: "only" },
  { at: "src/components/hub-page.tsx:85", what: "guides hub related link", open: (p) => p.goto("/guides"), locate: (p) => p.getByRole("region", { name: "Free tools" }).getByRole("listitem").first().getByRole("link"), hover: "only" },
  { at: "src/components/hub-page.tsx:90", what: "guides hub 'All free tools' link", open: (p) => p.goto("/guides"), locate: (p) => p.locator("#main").getByRole("link", { name: "All free tools" }), hover: "only" },
  { at: "src/app/newsletter/page.tsx:58", what: "newsletter archive issue title", open: (p) => p.goto("/newsletter"), locate: (p) => p.locator("article h3 a").first(), hover: "only" },
  { at: "src/app/faq/page.tsx:63", what: "FAQ 'Get your free preview' link", open: (p) => p.goto("/faq"), locate: (p) => p.getByRole("link", { name: "Get your free preview" }), hover: "also" },
  { at: "src/app/ship-loop/page.tsx:47", what: "Ship Loop eyebrow", open: (p) => p.goto("/ship-loop"), locate: (p) => p.getByText("Coming soon · Waitlist open", { exact: true }) },
  { at: "src/app/not-found.tsx:13", what: "404 eyebrow", open: (p) => p.goto("/nonexistent"), locate: (p) => p.getByRole("main").getByText("404", { exact: true }) },
  {
    at: "src/components/tools/tagline-checker.tsx:181",
    what: "tagline tool feed preview initial",
    open: (p) => p.goto("/tools/product-hunt-tagline-checker").then(() => p.getByLabel("Tagline", { exact: true }).fill("Turn your repo into a launch kit")),
    locate: (p) => p.getByTestId("tagline-preview").locator("div[aria-hidden]").first(),
  },
  {
    at: "src/components/tools/tagline-checker.tsx:236",
    what: "tagline tool 'Try a sample app'",
    open: (p) => p.goto("/tools/product-hunt-tagline-checker").then(() => p.getByRole("tab", { name: "Generate from repo or URL" }).click()),
    locate: (p) => p.getByRole("button", { name: "Try a sample app" }),
    hover: "only",
  },
  { at: "src/components/tools/og-preview.tsx:178", what: "OG tool 'Try it on LaunchLoop'", open: (p) => p.goto("/tools/og-preview"), locate: (p) => p.getByRole("button", { name: "Try it on LaunchLoop" }), hover: "only" },
  { at: "src/components/kit/kit-overview.tsx:20", what: "example kit 'Product brief' eyebrow", open: (p) => p.goto(EXAMPLE_KIT_PATH), locate: (p) => p.getByText("Product brief", { exact: true }) },
  { at: "src/components/kit/free-tagline.tsx:15", what: "kit free tagline heading", open: openSampleKit, locate: (p) => p.getByRole("heading", { name: "Your Product Hunt tagline · free" }) },
  { at: "src/components/kit/preview-paywall.tsx:64", what: "paywall 'Free preview done' eyebrow", open: openSampleKit, locate: (p) => p.getByTestId("preview-paywall").getByText("Free preview done") },
  { at: "src/components/kit/preview-paywall.tsx:104", what: "paywall 'Unlocked sample' label", open: openSampleKit, locate: (p) => p.getByTestId("paywall-sample").first().getByText("Unlocked sample", { exact: true }) },
  {
    at: "src/components/kit/unlock-panel.tsx:224",
    what: "unlock panel LAUNCH14 code",
    open: openSampleKit,
    locate: (p) =>
      insertPromoMarkup(
        p,
        p.getByTestId("unlock-panel").locator("p", { hasText: "once, no subscription" }),
        renderToStaticMarkup(createElement(UnlockPanel, { kitId: sampleKit!, priceLabel: "£19", launchPromo: { variant: "treatment" }, autoCheckout: false, cancelled: false, saved: false })),
        "launch-promo",
      ),
  },
  { at: "src/app/checkout/success/page.tsx:36", what: "guest success 'Payment received' eyebrow", open: openGuestSuccess, locate: (p) => p.getByTestId("guest-success").getByText("Payment received") },
];

/** The element's colour once :hover (or its absence) has applied and no transition is running. */
const settledColor = (target: Locator) =>
  expect
    .poll(() =>
      target.evaluate(
        (el) =>
          new Promise<string | null>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve(el.getAnimations().length ? null : getComputedStyle(el).color))),
          ),
      ),
    )
    .not.toBeNull();

test.describe("every listed orange-text use is at least 4.5:1, and CTA fills are unchanged", () => {
  for (const use of ORANGE_TEXT) {
    test(`${use.at}: ${use.what}`, async ({ page }) => {
      await use.open(page);
      const target = await use.locate(page);
      await expect(target).toBeVisible();
      await target.scrollIntoViewIfNeeded();
      if (use.hover !== "only") {
        await page.mouse.move(0, 0);
        await settledColor(target);
        expect(await contrast(target), `${use.at} at rest`).toBeGreaterThanOrEqual(4.5);
      }
      if (use.hover) {
        await target.hover();
        await settledColor(target);
        expect(await contrast(target), `${use.at} hovered`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  test("CTA fills are byte-identical: --primary, --primary-hover, --primary-foreground, and the header CTA at rest and hovered", async ({ page }) => {
    await page.goto("/");
    const tokens = await page.evaluate(() => ["--primary", "--primary-hover", "--primary-foreground"].map((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()));
    expect(tokens).toEqual(MAIN_CTA_TOKENS);

    const resolved = (color: string) =>
      page.evaluate((c) => {
        const probe = document.createElement("div");
        probe.style.color = c;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, color);
    const cta = page.getByRole("banner").getByRole("link", { name: /Get (my )?(launch )?kit/ });
    const fill = () => cta.evaluate((el) => ({ background: getComputedStyle(el).backgroundColor, label: getComputedStyle(el).color }));
    const [primary, primaryHover, primaryForeground] = MAIN_CTA_TOKENS;
    await page.mouse.move(0, 0);
    await settledColor(cta);
    expect(await fill()).toEqual({ background: await resolved(primary), label: await resolved(primaryForeground) });
    await cta.hover();
    await expect.poll(fill).toEqual({ background: await resolved(primaryHover), label: await resolved(primaryForeground) });
  });
});
