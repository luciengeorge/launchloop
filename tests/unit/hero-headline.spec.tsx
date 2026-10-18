import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroHeadline, HeroHeadlinePending } from "@/components/hero-headline";
import { EXPERIMENTS, isVariant, parseExperiments } from "@/lib/experiments";
import { HERO_HEADLINE_CONTROL, HERO_HEADLINE_TEST, resolveHeroHeadline, splitHeadline } from "@/lib/hero-headline";

const H1_CLASS = "max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl";
/** The home h1 exactly as it was before the experiment. */
const CONTROL_MARKUP = `<h1 class="${H1_CLASS}">Paste your repo. <span class="text-primary">Get your whole launch.</span></h1>`;

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);
const text = (node: React.ReactNode) => html(node).replace(/<[^>]+>/g, "");
const flags = (value: unknown) => async () => ({ [EXPERIMENTS.heroHeadline]: value });

test.describe("HeroHeadline", () => {
  test("control is the current headline, unchanged: not running, assigned control, and every fallback", () => {
    expect(HERO_HEADLINE_CONTROL).toBe("Paste your repo. Get your whole launch.");
    for (const served of [null, { variant: "control" as const }, { variant: "control" as const, fallback: "timeout" as const }, { variant: "control" as const, fallback: "unassigned" as const }]) {
      expect(html(<HeroHeadline served={served} />)).toBe(CONTROL_MARKUP);
    }
  });

  test("test shows HERO_HEADLINE_TEST in the same h1, styled the same way", () => {
    const markup = html(<HeroHeadline served={{ variant: "test" }} />);
    expect(text(<HeroHeadline served={{ variant: "test" }} />)).toBe(HERO_HEADLINE_TEST);
    const [lead, rest] = splitHeadline(HERO_HEADLINE_TEST);
    expect(markup).toBe(`<h1 class="${H1_CLASS}">${lead} <span class="text-primary">${rest}</span></h1>`);
  });

  test("until the assignment arrives: control held invisible (the same box, so nothing moves), shown without JavaScript", () => {
    const markup = html(<HeroHeadlinePending />);
    expect(markup).toContain(`<h1 class="${H1_CLASS} invisible" data-hero-pending="">Paste your repo. <span class="text-primary">Get your whole launch.</span></h1>`);
    expect(markup).toContain("<noscript><style>[data-hero-pending]{visibility:visible}</style></noscript>");
  });

  test("splitHeadline highlights everything after the first sentence, and nothing without a sentence break", () => {
    expect(splitHeadline("Paste your repo. Get your whole launch.")).toEqual(["Paste your repo.", "Get your whole launch."]);
    expect(splitHeadline("Ship it! Then tell everyone. Twice.")).toEqual(["Ship it!", "Then tell everyone. Twice."]);
    expect(splitHeadline("One link, your whole launch")).toEqual(["One link, your whole launch", ""]);
    expect(text(<HeroHeadline served={{ variant: "test" }} />)).toBe(HERO_HEADLINE_TEST);
  });
});

test.describe("resolveHeroHeadline", () => {
  test("assigned: control or test", async () => {
    expect(await resolveHeroHeadline(flags("control"))).toEqual({ variant: "control" });
    expect(await resolveHeroHeadline(flags("test"))).toEqual({ variant: "test" });
  });

  test("not running: the flag is missing or off (or PostHog is off), so null and nothing is recorded", async () => {
    expect(await resolveHeroHeadline(async () => ({}))).toBeNull();
    expect(await resolveHeroHeadline(async () => ({ exp_launch14_promo: "treatment" }))).toBeNull();
  });

  test("unassigned: the flag gives this id no variant, or one this page doesn't know", async () => {
    for (const value of [false, true, "treatment", "TEST", null]) {
      expect(await resolveHeroHeadline(flags(value))).toEqual({ variant: "control", fallback: "unassigned" });
    }
  });

  test("error: a thrown lookup is control and reported", async () => {
    const errors: unknown[] = [];
    const boom = new Error("flags request failed");
    expect(await resolveHeroHeadline(() => Promise.reject(boom), { onError: (e) => errors.push(e) })).toEqual({ variant: "control", fallback: "error" });
    expect(errors).toEqual([boom]);
  });

  test("timeout: a slow lookup is control, without holding the headline", async () => {
    const started = Date.now();
    expect(await resolveHeroHeadline(() => new Promise(() => {}), { timeoutMs: 50 })).toEqual({ variant: "control", fallback: "timeout" });
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

test("each experiment accepts only its own variants", () => {
  expect(isVariant(EXPERIMENTS.heroHeadline, "test")).toBe(true);
  expect(isVariant(EXPERIMENTS.heroHeadline, "treatment")).toBe(false);
  expect(isVariant(EXPERIMENTS.launchPromo, "test")).toBe(false);
  expect(isVariant(EXPERIMENTS.launchPromo, "treatment")).toBe(true);
  expect(isVariant(EXPERIMENTS.shipLoopUpsell, "test")).toBe(false);
  expect(parseExperiments({ exp_hero_headline: "test", exp_launch14_promo: "test", exp_shiploop_success_upsell: "treatment" })).toEqual({
    exp_hero_headline: "test",
    exp_shiploop_success_upsell: "treatment",
  });
  expect(parseExperiments({ exp_hero_headline: "treatment" })).toEqual({});
});
