import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroHeadline, HeroHeadlinePending } from "@/components/hero-headline";
import { EXPERIMENTS, isVariant, parseExperiments } from "@/lib/experiments";
import { HERO_HEADLINE_CONTROL, HERO_HEADLINE_TEST, lookupHeroHeadline, splitHeadline } from "@/lib/hero-headline";

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);
/** The headline element: the h1, or the placeholder div standing in for it. */
const h1 = (node: React.ReactNode) => html(node).match(/<(h1|div)\b[^>]*data-reserve[^]*?<\/\1>/)![0];
/** The visible headline: the h1's text (the other arm's headline is generated content, not text). */
const text = (node: React.ReactNode) => h1(node).replace(/<[^>]+>/g, "");
const reserve = (node: React.ReactNode) => h1(node).match(/data-reserve="([^"]*)"/)?.[1];
const h1Count = (node: React.ReactNode) => html(node).match(/<h1[\s>]/g)?.length ?? 0;

test.describe("HeroHeadline", () => {
  test("control: the current headline and highlight, not running, assigned control, and every fallback", () => {
    expect(HERO_HEADLINE_CONTROL).toBe("Paste your repo. Get your whole launch.");
    for (const served of [null, { variant: "control" as const }, { variant: "control" as const, fallback: "timeout" as const }, { variant: "control" as const, fallback: "unassigned" as const }]) {
      expect(text(<HeroHeadline served={served} />)).toBe(HERO_HEADLINE_CONTROL);
      expect(h1(<HeroHeadline served={served} />)).toContain('<span class="[grid-area:1/1]">Paste your repo. <span class="text-primary">Get your whole launch.</span></span>');
    }
  });

  test("test shows HERO_HEADLINE_TEST in the same h1, styled the same way", () => {
    expect(HERO_HEADLINE_TEST).toBe("Your repo in. All your launch posts out.");
    const [lead, rest] = splitHeadline(HERO_HEADLINE_TEST);
    expect(lead).toBe("Your repo in.");
    expect(text(<HeroHeadline served={{ variant: "test" }} />)).toBe(HERO_HEADLINE_TEST);
    expect(h1(<HeroHeadline served={{ variant: "test" }} />)).toContain(`${lead} <span class="text-primary">${rest}</span>`);
  });

  test("each arm reserves the other's headline, so both boxes are as tall as the taller one", () => {
    expect(reserve(<HeroHeadline served={null} />)).toBe(HERO_HEADLINE_TEST);
    expect(reserve(<HeroHeadline served={{ variant: "test" }} />)).toBe(HERO_HEADLINE_CONTROL);
    expect(reserve(<HeroHeadlinePending />)).toBe(HERO_HEADLINE_TEST);
    expect(h1(<HeroHeadlinePending />)).toContain("after:content-[attr(data-reserve)]");
  });

  test("until it arrives: control held invisible, shown by a CSS failsafe after 700 ms, and without JavaScript", () => {
    const markup = html(<HeroHeadlinePending />);
    expect(text(<HeroHeadlinePending />)).toBe(HERO_HEADLINE_CONTROL);
    expect(markup).toContain('data-hero-pending=""');
    expect(markup).toContain("[data-hero-pending]{visibility:hidden;animation:hero-failsafe 0s 700ms forwards}@keyframes hero-failsafe{to{visibility:visible}}");
    expect(markup).toContain("<noscript><style>[data-hero-pending]{visibility:visible;animation:none}</style></noscript>");
  });

  test("one h1: the streamed headline is the h1, the placeholder is a div with the heading role and the same box", () => {
    expect(h1Count(<HeroHeadline served={{ variant: "test" }} />)).toBe(1);
    expect(h1Count(<HeroHeadlinePending />)).toBe(0);
    const placeholder = h1(<HeroHeadlinePending />);
    expect(placeholder).toMatch(/^<div role="heading" aria-level="1" class="([^"]+)"/);
    expect(placeholder.match(/class="([^"]+)"/)![1]).toBe(h1(<HeroHeadline served={null} />).match(/class="([^"]+)"/)![1]);
  });

  test("the streamed headline brings a script that shows it in the placeholder, unless the failsafe already showed control", () => {
    const markup = html(<HeroHeadline served={{ variant: "test" }} />);
    expect(markup).toMatch(/<\/h1><script type="text\/javascript">.*data-hero-pending.*data-hero-ready.*data-hero-failsafe.*<\/script>$/);
  });

  test("splitHeadline highlights everything after the first sentence, and nothing without a sentence break", () => {
    expect(splitHeadline("Paste your repo. Get your whole launch.")).toEqual(["Paste your repo.", "Get your whole launch."]);
    expect(splitHeadline("Ship it! Then tell everyone. Twice.")).toEqual(["Ship it!", "Then tell everyone. Twice."]);
    expect(splitHeadline("One link, your whole launch")).toEqual(["One link, your whole launch", ""]);
  });
});

test.describe("lookupHeroHeadline", () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const answering =
    (body: unknown, status = 200): typeof fetch =>
    async (url, init) => {
      calls.push({ url: String(url), init: init! });
      return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    };
  const flag = (detail: unknown) => ({ flags: { [EXPERIMENTS.heroHeadline]: detail }, errorsWhileComputingFlags: false });
  const lookup = (fetchImpl: typeof fetch, extra: Partial<Parameters<typeof lookupHeroHeadline>[0]> = {}) =>
    lookupHeroHeadline({ host: "https://ph.test", token: "phc_test", distinctId: "hero:abc", fetch: fetchImpl, ...extra });
  test.beforeEach(() => {
    calls.length = 0;
  });

  test("one POST to /flags for this flag and id, with a timeout signal", async () => {
    expect(await lookup(answering(flag({ enabled: true, variant: "test" })))).toEqual({ variant: "test" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://ph.test/flags/?v=2");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ token: "phc_test", distinct_id: "hero:abc", flag_keys_to_evaluate: ["exp_hero_headline"], geoip_disable: true });
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
    expect(await lookup(answering(flag({ enabled: true, variant: "control" })))).toEqual({ variant: "control" });
  });

  test("not running: the flag is missing or disabled (PostHog leaves it out), so null and nothing is recorded", async () => {
    expect(await lookup(answering({ flags: {}, errorsWhileComputingFlags: false }))).toBeNull();
    expect(await lookup(answering({ flags: { exp_launch14_promo: { enabled: true, variant: "treatment" } } }))).toBeNull();
  });

  test("unassigned: the flag gives this id no variant, or one this page doesn't know", async () => {
    for (const detail of [{ enabled: false, variant: null }, { enabled: true, variant: null }, { enabled: true, variant: "treatment" }, { enabled: true, variant: "TEST" }]) {
      expect(await lookup(answering(flag(detail)))).toEqual({ variant: "control", fallback: "unassigned" });
    }
  });

  test("error, reported, without a retry: a failed request, a bad status, or PostHog unable to compute the flag", async () => {
    const errors: unknown[] = [];
    const onError = (e: unknown) => errors.push(e);
    const boom = new Error("connect ECONNREFUSED");
    let attempts = 0;
    const failing: typeof fetch = async () => {
      attempts++;
      throw boom;
    };
    expect(await lookup(failing, { onError })).toEqual({ variant: "control", fallback: "error" });
    expect(attempts).toBe(1);
    expect(errors).toEqual([boom]);
    expect(await lookup(answering({}, 503), { onError })).toEqual({ variant: "control", fallback: "error" });
    expect(calls).toHaveLength(1);
    expect(await lookup(answering({ flags: {}, errorsWhileComputingFlags: true }))).toEqual({ variant: "control", fallback: "error" });
    expect(await lookup(answering({ flags: {}, quotaLimited: ["feature_flags"] }))).toEqual({ variant: "control", fallback: "error" });
  });

  test("timeout: the request is aborted at the deadline, so nothing keeps running after control is served", async () => {
    let signal: AbortSignal | undefined;
    const hanging: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        signal = init!.signal!;
        signal.addEventListener("abort", () => reject(signal!.reason));
      });
    const started = Date.now();
    expect(await lookup(hanging, { timeoutMs: 50 })).toEqual({ variant: "control", fallback: "timeout" });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(signal!.aborted).toBe(true);
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
