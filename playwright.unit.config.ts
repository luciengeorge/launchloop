import { defineConfig } from "@playwright/test";

/** Node-only unit tests (no browser, no server): `npm test`. */
export default defineConfig({
  testDir: "./tests/unit",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
});
