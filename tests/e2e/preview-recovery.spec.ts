import { expect, test, type Page } from "@playwright/test";

const FIXTURE = "http://127.0.0.1:3419";

interface PhEvent {
  event: string;
  distinct_id?: string;
  properties: Record<string, unknown>;
}

const distinctId = (e: PhEvent) => e.distinct_id ?? (e.properties.distinct_id as string | undefined);

test.use({
  // posthog-js drops every event from a likely bot (HeadlessChrome UA or brand, navigator.webdriver).
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  // Own preview rate-limit bucket, so these previews don't eat the budget the other specs share.
  extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 20}` },
});
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });
});

const ndjson = (...events: object[]) => events.map((e) => `${JSON.stringify(e)}\n`).join("");

async function campaignEvent(page: Page, campaign: string, event: string): Promise<PhEvent> {
  let found: PhEvent | undefined;
  await expect
    .poll(async () => {
      const events = (await (await page.request.get(`${FIXTURE}/ph/_events`)).json()) as PhEvent[];
      found = events.find((e) => e.event === event && e.properties.utm_campaign === campaign);
      return found;
    })
    .toBeTruthy();
  return found!;
}

test("Try again after a failed sample run resends the sample, not the empty input", async ({ page }) => {
  const sent: unknown[] = [];
  let calls = 0;
  await page.route("**/api/kits", async (route) => {
    sent.push(route.request().postDataJSON().url);
    if (calls++ > 0) return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: ndjson({ type: "error", status: 503, error: "Our AI is busy, try again in a minute.", code: "ai_busy", fix: "Nothing is wrong with your link, and nothing was saved." }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  const alert = page.getByTestId("kit-error");
  await expect(alert).toHaveAttribute("data-code", "ai_busy");
  await expect(page.getByLabel("GitHub repo or live site URL")).toHaveValue("");

  await alert.getByRole("button", { name: "Retry" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  expect(sent).toEqual(["sample", "sample"]);
});

test("a stream cut after the accepted line opens the kit page, which waits for the preview", async ({ page }) => {
  const campaign = `recovery-${Date.now()}`;
  // Pass the real response through until the accepted line, then fail the read like a dropped connection.
  await page.addInitScript(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const res = await realFetch(input, init);
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (!url.endsWith("/api/kits") || init?.method !== "POST" || !res.body) return res;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let seen = "";
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (seen.includes('"accepted"')) {
            await reader.cancel();
            return controller.error(new TypeError("network error"));
          }
          const { value, done } = await reader.read();
          if (done) return controller.close();
          seen += decoder.decode(value, { stream: true });
          controller.enqueue(value);
        },
      });
      return new Response(body, { status: res.status, headers: res.headers });
    };
  });

  await page.goto(`/?utm_campaign=${campaign}&qa=1`);
  await page.getByLabel("GitHub repo or live site URL").fill(`${FIXTURE}/slowish`);
  await page.getByRole("button", { name: "Get my free preview" }).first().click();

  await page.waitForURL(/\/kit\/[\w-]+$/);
  await expect(page.getByTestId("kit-pending")).toHaveAttribute("data-state", "generating");
  await expect(page.getByRole("button", { name: "Unlock the full kit, £19" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("kit-pending")).toHaveCount(0);
  await expect(page.getByTestId("kit-error")).toHaveCount(0);

  const failed = await campaignEvent(page, campaign, "preview_failed");
  expect(failed.properties).toMatchObject({ code: "network", phase: "stream", errorName: "TypeError", recovered: true, online: true, visibility: "visible", qa: true, is_webdriver: false });
  // The browser never saw the stream finish, so no preview_completed; the server still records the kit, on the same visitor.
  const kitId = new URL(page.url()).pathname.split("/").pop();
  const created = await campaignEvent(page, campaign, "kit_created");
  expect(created.properties).toMatchObject({ kitId, source: "site", stream: true, is_test: true });
  expect(distinctId(created)).toBeTruthy();
  expect(distinctId(created)).toBe(distinctId(failed));
});

test("a stream that ends after accepted without done still opens the kit", async ({ page }) => {
  const { id } = (await (await page.request.post("/api/kits", { data: { url: "sample" } })).json()) as { id: string };
  await page.route("**/api/kits", (route) =>
    route.fulfill({ status: 200, contentType: "application/x-ndjson", body: ndjson({ type: "accepted", id }, { type: "step", step: "site" }) }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(new RegExp(`/kit/${id}$`));
  await expect(page.getByRole("button", { name: "Unlock the full kit, £19" })).toBeVisible();
});

test("a stream that drops before accepted shows the network error with Try again", async ({ page }) => {
  await page.route("**/api/kits", (route) => route.fulfill({ status: 200, contentType: "application/x-ndjson", body: ndjson({ type: "step", step: "site" }) }));

  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  const alert = page.getByTestId("kit-error");
  await expect(alert).toHaveAttribute("data-code", "network");
  await expect(alert).toContainText("The connection dropped");
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");
});
