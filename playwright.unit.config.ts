import { defineConfig } from "@playwright/test";

/** Node-only unit tests (no browser, no server): `npm test`. */
export default defineConfig({
  testDir: "./tests/unit",
  // *.test.ts files in the same folder are Vitest's (vitest.config.mts).
  testMatch: "**/*.spec.{ts,tsx}",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
});
