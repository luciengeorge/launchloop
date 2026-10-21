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
  const send = (event: string, properties: Record<string, unknown>) => config.before_send!({ event, properties } as unknown as CaptureResult) as CaptureResult;
  return { analytics, config, send };
}

describe("posthog-js config", () => {
  it("captures $pageleave, autocaptures only hero clicks on links, buttons and the URL field, and keeps replay off", async () => {
    const { analytics, config } = await load();
    expect(config.capture_pageleave).toBe(true);
    expect(config.disable_session_recording).toBe(true);
    expect(config.capture_heatmaps).toBe(false);
    expect(config.capture_dead_clicks).toBe(false);
    expect(config.autocapture).toEqual({
      dom_event_allowlist: ["click"],
      css_selector_allowlist: [`[${analytics.CAPTURE_CLICKS_ATTR}]`],
      element_allowlist: ["a", "button", "input"],
      element_attribute_ignorelist: ["value"],
      capture_copied_text: false,
    });
    expect(analytics.captureClicks).toEqual({ [analytics.CAPTURE_CLICKS_ATTR]: "" });
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
