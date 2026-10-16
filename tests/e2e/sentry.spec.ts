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
