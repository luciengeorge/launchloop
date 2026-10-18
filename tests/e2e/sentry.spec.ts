import { expect, test, type APIRequestContext } from "@playwright/test";

const FIXTURE = "http://127.0.0.1:3419";
const HEADER = { "x-sentry-test-token": "playwright-sentry-token" };

interface SentryEvent {
  exception?: { values?: { value?: string }[] };
  tags?: Record<string, string>;
}

/** Polls the fixture's fake Sentry for an error event whose exception message passes `match`. */
async function sentryEvent(request: APIRequestContext, match: (message: string) => boolean) {
  let found: SentryEvent | undefined;
  await expect
    .poll(async () => {
      const events = (await (await request.get(`${FIXTURE}/sentry/_events`)).json()) as SentryEvent[];
      found = events.find((e) => e.exception?.values?.some((v) => !!v.value && match(v.value)));
      return found;
    })
    .toBeTruthy();
  return found!;
}

interface SentrySpan {
  name: string;
  trace_id: string;
  attributes?: Record<string, { value: unknown }>;
}

const attr = (span: SentrySpan | undefined, key: string) => span?.attributes?.[key]?.value;
const previewIp = () => ({ "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 20}` });

/** Waits for the kits.request span of one preview, then returns every span in its trace by name. */
async function previewTrace(request: APIRequestContext, kitId: string) {
  let spans: SentrySpan[] = [];
  await expect
    .poll(
      async () => {
        const all = (await (await request.get(`${FIXTURE}/sentry/_spans`)).json()) as SentrySpan[];
        const root = all.find((s) => s.name === "kits.request" && attr(s, "kit.id") === kitId);
        spans = root ? all.filter((s) => s.trace_id === root.trace_id) : [];
        return spans.length;
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
  return { spans, byName: (name: string) => spans.find((s) => s.name === name) };
}

test("a preview is traced: request, rate limit, site fetch, each LLM call and the DB write", async ({ request }) => {
  const res = await request.post("/api/kits", { data: { url: `${FIXTURE}/` }, headers: previewIp() });
  expect(res.status()).toBe(201);
  const { id } = (await res.json()) as { id: string };

  const { byName } = await previewTrace(request, id);
  const root = byName("kits.request");
  expect(attr(root, "kit.status")).toBe("ok");
  expect(attr(root, "kit.source")).toBe("site");
  expect(typeof attr(root, "duration_ms")).toBe("number");
  for (const name of ["kits.rate_limit", "ingest.site", "llm.brief", "llm.preview", "db.kit.save"]) {
    expect(attr(byName(name), "kit.status"), name).toBe("ok");
  }
  expect(attr(byName("ingest.site"), "kit.site_host")).toBe("127.0.0.1:3419");
});

test("a failed preview records the error code on its spans, and never the site's path or query", async ({ request }) => {
  const res = await request.post("/api/kits", {
    data: { url: `${FIXTURE}/llmfail?invite=secret-invite` },
    headers: { ...previewIp(), accept: "application/x-ndjson" },
  });
  const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l) as { type: string; id?: string; code?: string });
  expect(lines[0].type).toBe("accepted");
  expect(lines.at(-1)).toMatchObject({ type: "error", code: "ai_busy" });

  const { spans, byName } = await previewTrace(request, lines[0].id!);
  const root = byName("kits.request");
  expect(attr(root, "kit.status")).toBe("error");
  expect(attr(root, "error.code")).toBe("ai_busy");
  expect(attr(root, "kit.input")).toBe(FIXTURE);
  expect(attr(byName("ingest.site"), "kit.status")).toBe("ok");
  expect(attr(byName("llm.brief"), "error.code")).toBe("ai_busy");
  expect(JSON.stringify(spans)).not.toContain("secret-invite");

  // AI failures are reported once (throttled) from llm.ts, not per visitor; whatever Sentry holds never has the query.
  expect(JSON.stringify(await (await request.get(`${FIXTURE}/sentry/_events`)).json())).not.toContain("secret-invite");
});

test("the Sentry test route doesn't exist without the secret header", async ({ request }) => {
  expect((await request.get("/api/sentry-test")).status()).toBe(404);
  expect((await request.get("/api/sentry-test", { headers: { "x-sentry-test-token": "wrong" } })).status()).toBe(404);
  expect((await request.get("/api/sentry-test?mode=caught", { headers: { "x-sentry-test-token": "" } })).status()).toBe(404);
});

test("errors caught and logged in a route handler reach Sentry", async ({ request }) => {
  const res = await request.get("/api/sentry-test?mode=caught", { headers: HEADER });
  expect(res.status()).toBe(500);
  const { captured } = (await res.json()) as { captured: string };
  const event = await sentryEvent(request, (m) => m === captured);
  expect(event.tags?.stage).toBe("api.sentry-test");
});

test("uncaught route handler errors reach Sentry", async ({ request }) => {
  const seen = new Set(((await (await request.get(`${FIXTURE}/sentry/_events`)).json()) as SentryEvent[]).flatMap((e) => e.exception?.values?.map((v) => v.value) ?? []));
  expect((await request.get("/api/sentry-test", { headers: HEADER })).status()).toBe(500);
  await sentryEvent(request, (m) => m.startsWith("Sentry test error (thrown)") && !seen.has(m));
});
