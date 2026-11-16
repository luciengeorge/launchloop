import { afterEach, describe, expect, it, vi } from "vitest";

const FIXTURE = "tests/fixtures/directory-pack/directories.csv";

async function directoryPackCsv(vars: Record<string, string>) {
  vi.resetModules();
  for (const [name, value] of Object.entries({ NODE_ENV: "test", VERCEL_ENV: "", MOCK_MODE: "", ...vars })) vi.stubEnv(name, value);
  return (await import("@/lib/env")).env.directoryPackCsv;
}

afterEach(() => vi.unstubAllEnvs());

describe("TEST_DIRECTORY_PACK_CSV", () => {
  it("points the loader at a fixture outside production", async () => {
    expect(await directoryPackCsv({ TEST_DIRECTORY_PACK_CSV: FIXTURE })).toBe(FIXTURE);
  });

  it("the old name DIRECTORY_PACK_CSV does nothing", async () => {
    expect(await directoryPackCsv({ DIRECTORY_PACK_CSV: FIXTURE })).toBeUndefined();
  });

  it.each([
    ["VERCEL_ENV=production", { VERCEL_ENV: "production" }],
    ["VERCEL_ENV=production, even in mock mode", { VERCEL_ENV: "production", MOCK_MODE: "true" }],
    ["NODE_ENV=production (next start without mock mode)", { NODE_ENV: "production" }],
    ["any VERCEL_ENV, even preview in mock mode", { VERCEL_ENV: "preview", MOCK_MODE: "true" }],
    ["any VERCEL_ENV, even development", { VERCEL_ENV: "development", NODE_ENV: "test" }],
  ])("is ignored with %s", async (_label, vars) => {
    expect(await directoryPackCsv({ TEST_DIRECTORY_PACK_CSV: FIXTURE, ...vars })).toBeUndefined();
  });

  it("is honoured by the e2e builds: next start sets NODE_ENV=production, and they force MOCK_MODE=true", async () => {
    expect(await directoryPackCsv({ TEST_DIRECTORY_PACK_CSV: FIXTURE, NODE_ENV: "production", MOCK_MODE: "true" })).toBe(FIXTURE);
  });
});

/** The real env.ts rule, from real environment variables: only the module is re-imported, nothing is mocked. */
async function localFallback(vars: { VERCEL_ENV: string; NODE_ENV: string; MOCK_MODE: string }) {
  vi.resetModules();
  for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value);
  return (await import("@/lib/env")).env.directoryPackLocalFallback;
}

/** Where buyers may get the committed 20 when Redis has no list: local `next dev`, and the mock-mode builds (the e2e suite). */
const ALLOWED = new Set(["unset/development/off", "unset/development/on", "unset/test/on", "unset/production/on"]);

describe("the committed 20-row fallback (env.directoryPackLocalFallback)", () => {
  const cases = ["unset", "preview", "production"].flatMap((vercelEnv) =>
    ["development", "test", "production"].flatMap((nodeEnv) => ["off", "on"].map((mock) => [`${vercelEnv}/${nodeEnv}/${mock}`, vercelEnv, nodeEnv, mock] as const)),
  );

  it.each(cases)("VERCEL_ENV/NODE_ENV/MOCK_MODE %s", async (key, vercelEnv, nodeEnv, mock) => {
    const allowed = await localFallback({ VERCEL_ENV: vercelEnv === "unset" ? "" : vercelEnv, NODE_ENV: nodeEnv, MOCK_MODE: mock === "on" ? "true" : "" });
    expect(allowed).toBe(ALLOWED.has(key));
  });

  it("is never allowed once VERCEL_ENV is set, whatever NODE_ENV and MOCK_MODE say", () => {
    expect(cases.filter(([key, vercelEnv]) => vercelEnv !== "unset" && ALLOWED.has(key))).toEqual([]);
    expect(cases.filter(([, vercelEnv]) => vercelEnv !== "unset")).toHaveLength(12);
  });
});
