import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn() }));

const { IngestError, ingest, normaliseInput, normaliseKitInput } = await import("@/lib/ingest");
const { freePreviewGate } = await import("@/lib/rate-limit");

const OWNER_ONLY = ["https://github.com", "https://github.com/", "github.com/sindresorhus", "https://github.com/sindresorhus/", "https://www.github.com/sindresorhus", "github.com/sindresorhus?tab=repositories"];

function rejection(input: string): InstanceType<typeof IngestError> | undefined {
  try {
    normaliseKitInput(input);
  } catch (error) {
    if (error instanceof IngestError) return error;
    throw error;
  }
  return undefined;
}

let mem: MemoryStore;
beforeEach(() => {
  mem = new MemoryStore();
  kv.store = mem;
});

describe("github.com links without owner/repo", () => {
  it.each(OWNER_ONLY)("%s is invalid_url with a repo URL hint", (input) => {
    expect(rejection(input)).toMatchObject({ code: "invalid_url", userMessage: "Paste a repo URL like github.com/owner/repo." });
  });

  it.each(["github.com/sindresorhus/got", "https://github.com/sindresorhus/got/", "https://www.github.com/vercel/next.js/tree/canary"])(
    "%s is a repo and passes",
    (input) => {
      expect(rejection(input)).toBeUndefined();
    },
  );

  it("doesn't touch other GitHub hosts, sites or the sample", () => {
    for (const input of ["https://sindresorhus.github.io/", "https://gist.github.com/sindresorhus", "https://example.com/", "sample"]) expect(rejection(input)).toBeUndefined();
  });

  it("the OG preview tool's plain normaliser still accepts a profile page", () => {
    expect(normaliseInput("https://github.com/sindresorhus")).toBe("https://github.com/sindresorhus");
  });

  it("ingest refuses before fetching anything, instead of scraping the profile page", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const steps: string[] = [];
    await expect(ingest("https://github.com/sindresorhus/", (step) => steps.push(step))).rejects.toMatchObject({ code: "invalid_url" });
    expect(steps).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("the free preview gate answers 422 invalid_url and counts nothing against the IP", async () => {
    const req = new Request("http://localhost/api/kits", { method: "POST", headers: { "x-forwarded-for": "203.0.113.99" } });
    const { refused } = await freePreviewGate(req, "github.com/sindresorhus");
    expect(refused?.status).toBe(422);
    expect(await refused?.json()).toMatchObject({ code: "invalid_url", error: "Paste a repo URL like github.com/owner/repo." });
    expect(mem.keys()).toEqual([]);
  });
});
