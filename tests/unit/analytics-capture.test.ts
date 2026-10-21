import { describe, expect, it, vi } from "vitest";
import type { CaptureResult, PostHogConfig } from "posthog-js";
import { EXPERIMENTS, parseExperiments } from "@/lib/experiments";

const posthog = vi.hoisted(() => ({ __loaded: false, init: vi.fn(), register: vi.fn(), capture: vi.fn(), get_distinct_id: () => "ph_page" }));
vi.mock("posthog-js", () => ({ default: posthog }));

/** A fresh page load: the analytics module and the config it gives posthog-js. */
async function load() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_unit");
  vi.stubGlobal("window", { location: new URL("https://launchloop.dev/") });
  vi.stubGlobal("document", { referrer: "" });
  vi.stubGlobal("navigator", { webdriver: false });
  vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: () => {} });
  const analytics = await import("@/lib/analytics");
  await analytics.loadAnalytics();
  const config = posthog.init.mock.calls.at(-1)![1] as Partial<PostHogConfig>;
  const beforeSend = config.before_send as (event: CaptureResult | null) => CaptureResult | null;
  const send = (event: string, properties: Record<string, unknown>) => beforeSend({ event, properties } as unknown as CaptureResult)!;
  return { analytics, config, send };
}

describe("posthog-js config", () => {
  it("captures $pageleave; no autocapture, heatmaps, dead clicks or session replay (hero clicks are sent explicitly)", async () => {
    const { config } = await load();
    expect(config.capture_pageleave).toBe(true);
    expect(config.autocapture).toBe(false);
    expect(config.capture_heatmaps).toBe(false);
    expect(config.capture_dead_clicks).toBe(false);
    expect(config.disable_session_recording).toBe(true);
  });
});

describe("experiment properties on events", () => {
  const hero = EXPERIMENTS.heroSampleCta;

  it("an event after the hero is served carries the variant shown, not posthog-js's own evaluation", async () => {
    const { analytics, send } = await load();
    analytics.rememberServed(hero, { variant: "test" });
    const event = send("preview_started", { source: "sample", [`$feature/${hero}`]: "control", [`$feature/${EXPERIMENTS.launchPromo}`]: "treatment" });
    expect(event.properties).toMatchObject({ source: "sample", [`$feature/${hero}`]: "test" });
    // The promo is bucketed on the kit, not this page: posthog-js's guess for the page's id is dropped.
    expect(event.properties).not.toHaveProperty(`$feature/${EXPERIMENTS.launchPromo}`);
  });

  it("control served as a fallback is tagged fallback/<key>, which stays out of the experiment", async () => {
    const { analytics, send } = await load();
    analytics.rememberServed(hero, { variant: "control", fallback: "timeout" });
    // The flags came in late (test): the page still showed control, and the event says so.
    const event = send("preview_started", { [`$feature/${hero}`]: "test" });
    expect(event.properties).toMatchObject({ [`fallback/${hero}`]: "control" });
    expect(event.properties).not.toHaveProperty(`$feature/${hero}`);
  });

  it("the sample CTA exposure carries the headline the page showed, not posthog-js's evaluation of it", async () => {
    const { analytics, send } = await load();
    const headline = EXPERIMENTS.heroHeadline;
    // The server rendered control; posthog-js, evaluating exp_hero_headline for this page's own id, says test.
    analytics.rememberServed(headline, { variant: "control" });
    analytics.rememberServed(hero, { variant: "test" });
    const exposure = send("$feature_flag_called", { $feature_flag: hero, $feature_flag_response: "test", [`$feature/${hero}`]: "test", [`$feature/${headline}`]: "test" });
    expect(exposure.properties).toEqual({ $feature_flag: hero, $feature_flag_response: "test", [`$feature/${hero}`]: "test", [`$feature/${headline}`]: "control" });

    // A headline served as a fallback is tagged fallback/<key> on the exposure too.
    const fallback = await load();
    fallback.analytics.rememberServed(headline, { variant: "control", fallback: "timeout" });
    const tagged = fallback.send("$feature_flag_called", { $feature_flag: hero, $feature_flag_response: "control", [`$feature/${hero}`]: "control", [`$feature/${headline}`]: "test" });
    expect(tagged.properties).toMatchObject({ [`$feature/${hero}`]: "control", [`fallback/${headline}`]: "control" });
    expect(tagged.properties).not.toHaveProperty(`$feature/${headline}`);
  });

  it("an exposure keeps posthog-js's value for an experiment the page didn't serve", async () => {
    const { analytics, send } = await load();
    analytics.rememberServed(hero, { variant: "control" });
    const exposure = { $feature_flag: hero, $feature_flag_response: "control", [`$feature/${hero}`]: "control", [`$feature/${EXPERIMENTS.heroHeadline}`]: "test" };
    expect(send("$feature_flag_called", exposure).properties).toEqual(exposure);
  });

  it("nothing served on this page: no experiment properties at all, and the exposure is left as sent", async () => {
    const { send } = await load();
    expect(send("$pageview", { [`$feature/${hero}`]: "test" }).properties).toEqual({});
    const exposure = { $feature_flag: hero, $feature_flag_response: "test", [`$feature/${hero}`]: "test" };
    expect(send("$feature_flag_called", exposure).properties).toEqual(exposure);
  });
});

describe("parseExperiments", () => {
  it("knows each flag's own variants", () => {
    expect(parseExperiments({ exp_hero_sample_cta: "test", exp_launch14_promo: "treatment", exp_shiploop_success_upsell: "control" })).toEqual({
      exp_hero_sample_cta: "test",
      exp_launch14_promo: "treatment",
      exp_shiploop_success_upsell: "control",
    });
    expect(parseExperiments({ exp_hero_sample_cta: "treatment", exp_launch14_promo: "test", toString: "control", constructor: "control" })).toEqual({});
  });
});
