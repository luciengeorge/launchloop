import { defineConfig } from "@playwright/test";

/** Node-only unit tests (no browser, no server): `npm test`. `*.test.ts` files need module mocks and run under Vitest. */
export default defineConfig({
  testDir: "./tests/unit",
  testMatch: /\.spec\.tsx?$/,
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
});
