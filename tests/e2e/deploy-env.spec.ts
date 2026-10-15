import { readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { deployEnv, keyPrefix, stripeEventDecision } from "../../src/lib/deploy-env";

test.describe("deployment env isolation", () => {
  test("Redis keys are namespaced per environment, production unprefixed", () => {
    expect(deployEnv("production")).toBe("production");
    expect(deployEnv("preview")).toBe("preview");
    expect(deployEnv(undefined)).toBe("development");
    expect(deployEnv("")).toBe("development");
    expect(keyPrefix("production")).toBe("");
    expect(keyPrefix("preview")).toBe("preview:");
    expect(keyPrefix("development")).toBe("dev:");
  });

  test("Stripe events are only handled by the env that created the session", () => {
    const base = { livemode: false, secretKey: "sk_test_x" };
    expect(stripeEventDecision({ ...base, metadataEnv: "preview", current: "production" }).handle).toBe(false);
    expect(stripeEventDecision({ ...base, metadataEnv: "production", current: "preview" }).handle).toBe(false);
    expect(stripeEventDecision({ ...base, metadataEnv: "preview", current: "preview" }).handle).toBe(true);
    expect(stripeEventDecision({ ...base, metadataEnv: "production", current: "production" }).handle).toBe(true);
    // Sessions created before env metadata existed belong to production.
    expect(stripeEventDecision({ ...base, metadataEnv: undefined, current: "production" }).handle).toBe(true);
    expect(stripeEventDecision({ ...base, metadataEnv: undefined, current: "preview" }).handle).toBe(false);
  });

  test("production accepts test mode until live keys exist", () => {
    const p = { metadataEnv: "production", current: "production" as const };
    expect(stripeEventDecision({ ...p, livemode: false, secretKey: "sk_test_x" }).handle).toBe(true);
    expect(stripeEventDecision({ ...p, livemode: false, secretKey: "sk_live_x" }).handle).toBe(false);
    expect(stripeEventDecision({ ...p, livemode: true, secretKey: "sk_live_x" }).handle).toBe(true);
  });

  test("local store writes are dev-prefixed", async ({ request }) => {
    await request.post("/api/auth/request", { data: { email: "prefix-check@example.com" } });
    const files = readdirSync(path.join(process.cwd(), ".data-test"));
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.startsWith("dev_"))).toBe(true);
  });
});
