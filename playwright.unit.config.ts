import { defineConfig } from "@playwright/test";

/** Node-only unit tests (no browser, no server): `npm test`. */
export default defineConfig({
  testDir: "./tests/unit",
  // The *.test.ts files in the same folder are Vitest tests (`vitest run`).
  testMatch: /\.spec\.tsx?$/,
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
});
