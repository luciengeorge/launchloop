import { type ChildProcess, spawn } from "node:child_process";
import { expect, test } from "@playwright/test";
import { makeSampleKit } from "./helpers";

/**
 * The e2e build (.next-test) started a second time with VERCEL_ENV=production, so the real HTTP status a production
 * server sends for /checkout/mock is checked, not just what the page component throws.
 */
const PROD_PORT = 3422;
const PROD = `http://127.0.0.1:${PROD_PORT}`;
let server: ChildProcess | undefined;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  server = spawn("npx", ["next", "start", "-p", String(PROD_PORT)], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_DIST_DIR: ".next-test",
      VERCEL_ENV: "production",
      MOCK_MODE: "true",
      STRIPE_SECRET_KEY: "",
      KV_REST_API_URL: "",
      KV_REST_API_TOKEN: "",
      SENTRY_DSN: "",
      NEXT_PUBLIC_SITE_URL: PROD,
    },
    stdio: "ignore",
    // Its own process group, so afterAll stops npx and the next server it starts.
    detached: true,
  });
  await expect
    .poll(
      async () => {
        try {
          return (await fetch(`${PROD}/robots.txt`)).status;
        } catch {
          return 0;
        }
      },
      { timeout: 60_000, message: "the production-mode server started" },
    )
    .toBe(200);
});

test.afterAll(() => {
  if (server?.pid) process.kill(-server.pid, "SIGTERM");
});

test("production answers /checkout/mock with a real 404 and the not-found page's title", async ({ page }) => {
  for (const path of ["/checkout/mock", "/checkout/mock?product=kit&kitId=AKWq8__P15_kweHmfXX_Uw&aid=x"]) {
    const res = await page.goto(`${PROD}${path}`);
    expect(res?.status(), path).toBe(404);
    await expect(page).toHaveTitle("Page not found · LaunchLoop");
    await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
    expect(await page.content()).not.toContain("Test checkout");
  }
});

test("outside production the mock checkout still renders with its own title", async ({ page }) => {
  const kitId = await makeSampleKit(page);
  const res = await page.goto(`/checkout/mock?product=kit&kitId=${kitId}`);
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle("Test checkout · LaunchLoop");
  await expect(page.getByRole("note")).toContainText("Test mode");
});
