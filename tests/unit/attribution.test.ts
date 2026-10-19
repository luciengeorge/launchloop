import { beforeEach, describe, expect, it, vi } from "vitest";

const stripe = vi.hoisted(() => ({ create: vi.fn<(params: Record<string, unknown>) => Promise<{ url: string }>>(async () => ({ url: "https://checkout.stripe.com/c/pay/cs_test" })) }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { stripeSecretKey: "sk_test_unit" }, isStripeMock: () => false }));
vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: stripe.create } };
    promotionCodes = { list: vi.fn(async () => ({ data: [] })) };
  },
}));

const { attributionMetadata, attributionProperties, isQaLanding, isTestTraffic, parseAttribution, readLandingAttribution, testProperties, withTestTraffic } = await import("@/lib/attribution");
const { createCheckoutUrl } = await import("@/lib/payments");

const landingPage = { search: "?utm_source=hn&utm_medium=social&utm_campaign=launch&utm_term=vibe%20coding&utm_content=top-comment&plan=kit", hostname: "launchloop.dev" };

describe("readLandingAttribution", () => {
  it("reads every utm_* tag and the referrer's domain", () => {
    expect(readLandingAttribution(landingPage, "https://news.ycombinator.com/item?id=1")).toEqual({
      utm_source: "hn",
      utm_medium: "social",
      utm_campaign: "launch",
      utm_term: "vibe coding",
      utm_content: "top-comment",
      referring_domain: "news.ycombinator.com",
    });
  });

  it("ignores same-site and missing referrers, and returns nothing without UTMs", () => {
    expect(readLandingAttribution({ search: "?utm_source=x", hostname: "launchloop.dev" }, "https://www.launchloop.dev/faq")).toEqual({ utm_source: "x" });
    expect(readLandingAttribution({ search: "", hostname: "launchloop.dev" }, "")).toBeUndefined();
  });
});

describe("parseAttribution", () => {
  it("drops unknown keys, non-strings and empty values, and strips control characters", () => {
    expect(parseAttribution({ utm_source: " news\u0000letter\n ", utm_medium: 42, utm_campaign: "   ", product: "kit", kitId: "abc" })).toEqual({ utm_source: "news letter" });
    expect(parseAttribution("utm_source=hn")).toBeUndefined();
    expect(parseAttribution(null)).toBeUndefined();
  });

  it("truncates long values to 200 characters", () => {
    expect(parseAttribution({ utm_campaign: "x".repeat(5000) })?.utm_campaign).toHaveLength(200);
  });

  it("keeps only a valid hostname as the referring domain", () => {
    expect(parseAttribution({ referring_domain: "WWW.Reddit.com" })).toEqual({ referring_domain: "reddit.com" });
    expect(parseAttribution({ referring_domain: "https://evil.com/path" })).toBeUndefined();
    expect(parseAttribution({ referring_domain: "a..b" })).toBeUndefined();
  });
});

describe("attribution passthrough: landing page to the checkout_completed event", () => {
  beforeEach(() => stripe.create.mockClear());

  it("survives the /api/kits body, the kit record, Checkout metadata and the webhook unchanged", async () => {
    // Browser: first touch, sent in the preview request body.
    const firstTouch = readLandingAttribution(landingPage, "https://news.ycombinator.com/");
    const requestBody = JSON.parse(JSON.stringify({ url: "sample", attribution: firstTouch })) as { attribution: unknown };

    // /api/kits: validated and stored on the kit.
    const kitAttribution = parseAttribution(requestBody.attribution);

    // /api/checkout: copied into the session and PaymentIntent metadata next to the kit id.
    await createCheckoutUrl({ product: "kit", origin: "https://launchloop.dev", kitId: "kit_123", analyticsId: "ph_1", isLoggedIn: true, experiments: {}, fallbacks: [], attribution: kitAttribution });
    const params = stripe.create.mock.calls[0]![0] as { metadata: Record<string, string>; payment_intent_data: { metadata: Record<string, string> } };
    expect(params.metadata).toMatchObject({ kitId: "kit_123", ...firstTouch });
    expect(params.payment_intent_data.metadata).toEqual(params.metadata);

    // Webhook: the session metadata comes back as strings and becomes checkout_completed properties.
    expect(attributionProperties(params.metadata)).toEqual(firstTouch);
  });

  it("validates what goes into Stripe even if a stored record is bad", () => {
    expect(attributionMetadata({ utm_source: "x".repeat(600), referring_domain: "not a domain" })).toEqual({ utm_source: "x".repeat(200) });
    expect(attributionMetadata(undefined)).toEqual({});
  });

  it("adds no UTM metadata for a kit without attribution (older kits)", async () => {
    await createCheckoutUrl({ product: "kit", origin: "https://launchloop.dev", kitId: "kit_old", analyticsId: "ph_1", isLoggedIn: false, experiments: {}, fallbacks: [] });
    const params = stripe.create.mock.calls[0]![0] as { metadata: Record<string, string> };
    expect(params.metadata.kitId).toBe("kit_old");
    expect(Object.keys(params.metadata).filter((k) => k.startsWith("utm_") || k === "referring_domain")).toEqual([]);
  });
});

describe("QA traffic (is_test)", () => {
  it("is a landing with qa=1 or utm_source=qa, and nothing else", () => {
    for (const search of ["?qa=1", "?utm_source=qa", "?utm_source=QA&utm_campaign=smoke", "?utm_source=%20qa%20", "?utm_source=hn&qa=1"]) expect(isQaLanding(search)).toBe(true);
    for (const search of ["", "?qa=0", "?qa=true", "?utm_source=qatar", "?utm_medium=qa", "?utm_campaign=qa"]) expect(isQaLanding(search)).toBe(false);
  });

  it("goes on first touch next to the UTMs, even without any", () => {
    expect(readLandingAttribution({ search: "?utm_source=hn&qa=1", hostname: "launchloop.dev" }, "https://news.ycombinator.com/")).toEqual({
      utm_source: "hn",
      referring_domain: "news.ycombinator.com",
      is_test: true,
    });
    expect(readLandingAttribution({ search: "?qa=1", hostname: "launchloop.dev" }, "")).toEqual({ is_test: true });
    expect(readLandingAttribution(landingPage, "")).not.toHaveProperty("is_test");
  });

  it("parses true (browser, kit record) and \"1\" (Stripe metadata), and follows utm_source=qa on kits stored before the flag", () => {
    expect(parseAttribution({ is_test: true })).toEqual({ is_test: true });
    expect(parseAttribution({ is_test: "1", product: "kit" })).toEqual({ is_test: true });
    expect(parseAttribution({ utm_source: "qa" })).toEqual({ utm_source: "qa", is_test: true });
    for (const is_test of [false, "0", "true", 1, "yes"]) expect(parseAttribution({ utm_source: "hn", is_test })).toEqual({ utm_source: "hn" });
  });

  it("survives the /api/kits body, the kit, Checkout metadata (as \"1\") and the webhook", async () => {
    stripe.create.mockClear();
    const firstTouch = readLandingAttribution({ search: "?utm_source=hn&utm_campaign=smoke&qa=1", hostname: "launchloop.dev" }, "");
    const kitAttribution = parseAttribution(JSON.parse(JSON.stringify(firstTouch)));
    await createCheckoutUrl({ product: "kit", origin: "https://launchloop.dev", kitId: "kit_qa", analyticsId: "ph_1", isLoggedIn: false, experiments: {}, fallbacks: [], attribution: kitAttribution });
    const { metadata } = stripe.create.mock.calls[0]![0] as { metadata: Record<string, string> };
    expect(metadata).toMatchObject({ kitId: "kit_qa", utm_source: "hn", utm_campaign: "smoke", is_test: "1" });
    expect(attributionProperties(metadata)).toEqual({ utm_source: "hn", utm_campaign: "smoke", is_test: true });
    expect(testProperties(metadata)).toEqual({ is_test: true });
  });

  it("a QA-tagged request marks an untagged kit's purchase; real traffic carries no is_test at all", () => {
    expect(withTestTraffic({ utm_source: "hn" }, true)).toEqual({ utm_source: "hn", is_test: true });
    expect(withTestTraffic(undefined, true)).toEqual({ is_test: true });
    expect(withTestTraffic({ utm_source: "hn" }, false)).toEqual({ utm_source: "hn" });
    expect(attributionMetadata({ utm_source: "hn" })).toEqual({ utm_source: "hn" });
    expect(testProperties({ utm_source: "hn" })).toEqual({});
    expect(testProperties(undefined)).toEqual({});
    expect(isTestTraffic({ utm_source: "qa" })).toBe(true);
  });
});
