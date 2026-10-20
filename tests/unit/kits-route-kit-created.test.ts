import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    after: vi.fn((fn: () => unknown) => void pending.push(Promise.resolve().then(fn))),
    captureServerEvent: vi.fn<(event: string, params: unknown) => Promise<void>>(async () => {}),
    session: null as { email: string } | null,
  };
});

vi.mock("@/lib/store", async () => {
  const { MemoryStore } = await import("./memory-store");
  const mem = new MemoryStore();
  return { store: () => mem };
});
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn() }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn() }) }));
vi.mock("@/lib/auth", () => ({ ANON_KITS_COOKIE: "ll_anon_kits", getSession: async () => m.session, readAnonKits: () => [], secureCookies: () => false }));
vi.mock("@/lib/generation", () => ({ speculateDraft: vi.fn(async () => "capped") }));
vi.mock("@/lib/analytics-server", async (importOriginal) => ({ ...(await importOriginal<object>()), captureServerEvent: m.captureServerEvent }));
vi.mock("@/lib/kits", () => ({
  newId: () => "kitid_0123456789abcd",
  createKit: vi.fn(async (_url: string, _onStep: unknown, opts: { id: string; attribution?: unknown }) => ({ id: opts.id, attribution: opts.attribution })),
  markKitPending: vi.fn(async () => {}),
  markKitFailed: vi.fn(async () => {}),
}));

const { createKit } = await import("@/lib/kits");
const { IngestError } = await import("@/lib/ingest");
const { eventUuid } = await import("@/lib/analytics-server");
const { POST } = await import("@/app/api/kits/route");

let ipSeq = 0;
const post = (body: object, accept = "application/json") =>
  POST(
    new Request("http://localhost/api/kits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: accept, "x-forwarded-for": `198.51.100.${++ipSeq}` },
      body: JSON.stringify(body),
    }),
  );

const flush = () => Promise.all(m.pending.splice(0));
const kitCreated = () => m.captureServerEvent.mock.calls.filter(([event]) => event === "kit_created").map(([, params]) => params as { distinctId: string; uuid: string; properties: Record<string, unknown> });

beforeEach(() => {
  m.pending.length = 0;
  m.session = null;
  vi.clearAllMocks();
});

describe("kit_created from POST /api/kits", () => {
  it("is captured once the kit is saved, on the browser's id, with the kit's first touch", async () => {
    const res = await post({ url: "https://github.com/acme/app", analyticsId: "ph_browser", attribution: { utm_source: "hn", utm_campaign: "show", referring_domain: "news.ycombinator.com" } });
    expect(res.status).toBe(201);
    await flush();

    expect(kitCreated()).toEqual([
      {
        distinctId: "ph_browser",
        uuid: eventUuid("kit_created:kitid_0123456789abcd"),
        properties: {
          kitId: "kitid_0123456789abcd",
          source: "github",
          isLoggedIn: false,
          stream: false,
          reused: false,
          durationMs: expect.any(Number),
          utm_source: "hn",
          utm_campaign: "show",
          referring_domain: "news.ycombinator.com",
        },
      },
    ]);
  });

  it("falls back to a server_ id without a usable browser id", async () => {
    await post({ url: "sample" });
    await post({ url: "sample", analyticsId: "<script>alert(1)</script>" });
    await flush();
    const [a, b] = kitCreated();
    expect(a.distinctId).toMatch(/^server_[0-9a-f-]{36}$/);
    expect(b.distinctId).toMatch(/^server_[0-9a-f-]{36}$/);
    expect(a.properties).toMatchObject({ source: "sample" });
  });

  it("carries is_test for QA traffic (utm_source=qa or the tab's QA tag), like checkout", async () => {
    await post({ url: "https://acme.dev", analyticsId: "ph_qa", attribution: { utm_source: "qa" } });
    await post({ url: "https://acme.dev", analyticsId: "ph_qa_tab", attribution: { utm_source: "hn", is_test: true } });
    await flush();
    expect(kitCreated().map((e) => e.properties)).toEqual([
      expect.objectContaining({ source: "site", utm_source: "qa", is_test: true }),
      expect.objectContaining({ source: "site", utm_source: "hn", is_test: true }),
    ]);
  });

  it("marks a signed-in preview and a kit reused from the same repo state", async () => {
    m.session = { email: "a@example.com" };
    vi.mocked(createKit).mockImplementationOnce(async (_url, _onStep, opts) => ({ id: opts!.id!, reusedFrom: "older_kit_id_000000" }) as never);
    await post({ url: "https://github.com/acme/app", analyticsId: "ph_1" });
    await flush();
    expect(kitCreated()[0].properties).toMatchObject({ isLoggedIn: true, reused: true });
  });

  it("isn't captured when the preview fails", async () => {
    vi.mocked(createKit).mockRejectedValueOnce(new IngestError("404", "repo_not_found")).mockRejectedValueOnce(new IngestError("404", "repo_not_found"));
    expect((await post({ url: "https://github.com/acme/private", analyticsId: "ph_1" })).status).toBe(422);
    const streamed = await post({ url: "https://github.com/acme/private", analyticsId: "ph_1" }, "application/x-ndjson");
    expect(await streamed.text()).toContain('"code":"repo_not_found"');
    await flush();
    expect(kitCreated()).toEqual([]);
  });

  it("is captured for a streamed preview whose browser left mid-generation, flagged client_disconnected", async () => {
    let finish!: () => void;
    const generating = new Promise<void>((resolve) => (finish = resolve));
    vi.mocked(createKit).mockImplementationOnce(async (_url, onStep, opts) => {
      await generating;
      onStep?.("brief");
      return { id: opts!.id!, attribution: opts!.attribution } as never;
    });

    const res = await post({ url: "https://github.com/acme/app", analyticsId: "ph_left", attribution: { utm_source: "hn" } }, "application/x-ndjson");
    const reader = res.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('"type":"accepted"');
    // The tab closes: no browser left to send preview_completed.
    await reader.cancel();
    finish();
    await vi.waitFor(() => expect(m.after).toHaveBeenCalled());
    await flush();

    expect(kitCreated()).toEqual([
      expect.objectContaining({
        distinctId: "ph_left",
        properties: expect.objectContaining({ kitId: "kitid_0123456789abcd", stream: true, client_disconnected: true, utm_source: "hn" }),
      }),
    ]);
  });

  it("a streamed preview the browser saw through has no client_disconnected", async () => {
    const res = await post({ url: "sample", analyticsId: "ph_stayed" }, "application/x-ndjson");
    expect(await res.text()).toContain('"type":"done"');
    await flush();
    const [event] = kitCreated();
    expect(event.properties).toMatchObject({ stream: true, source: "sample" });
    expect(event.properties).not.toHaveProperty("client_disconnected");
  });
});
