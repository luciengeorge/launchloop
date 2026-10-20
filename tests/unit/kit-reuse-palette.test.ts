import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";
import type { Kit, Palette } from "@/lib/schema";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
const ingestMock = vi.hoisted(() => ({ ingest: vi.fn() }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/ingest", () => ({ ingest: ingestMock.ingest }));
vi.mock("@/lib/generation", () => ({ copyDraft: vi.fn() }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn(), addBreadcrumb: vi.fn() }));

const { DEFAULT_PALETTE } = await import("@/lib/ingest/colors");
const { createKit, getKit } = await import("@/lib/kits");

const FINGERPRINT = "https://github.com/luciengeorge/haypile@abc123";
const REPO_PALETTE: Palette = { background: "#f2eee5", foreground: "#0a0a10", accent: "#2e7d6e", accentForeground: "#ffffff", muted: "#626161", source: "repo" };
const SITE_PALETTE: Palette = { background: "#ffffff", foreground: "#0a0a10", accent: "#e4572e", accentForeground: "#ffffff", muted: "#626161", source: "site" };

const cachedKit = (palette: Palette): Kit => ({
  id: "cachedkit0123456789",
  createdAt: new Date().toISOString(),
  status: "preview",
  source: { input: "https://github.com/luciengeorge/haypile", repoUrl: "https://github.com/luciengeorge/haypile", fingerprint: FINGERPRINT, commitsAnalysed: 20, readmeFound: true, packageJsonFound: true, pageScraped: false, warnings: [] },
  brief: { name: "Haypile", oneLiner: "Search everything you saved", audience: "savers", problem: "Saves are scattered", features: ["Search"], proofPoints: [], stack: [], tone: "plain" },
  palette,
  preview: { tagline: "Find what you saved", xPost: "I built Haypile." },
  digest: "",
  llm: "mock",
  paid: false,
  attempts: 0,
});

let mem: MemoryStore;
beforeEach(async () => {
  mem = new MemoryStore();
  kv.store = mem;
  ingestMock.ingest.mockResolvedValue({ primary: "repo", palette: REPO_PALETTE, source: { input: "https://github.com/luciengeorge/haypile", fingerprint: FINGERPRINT, commitsAnalysed: 20, readmeFound: true, packageJsonFound: true, pageScraped: false, warnings: [] } });
});

async function seed(palette: Palette) {
  const kit = cachedKit(palette);
  await mem.set(`kit:${kit.id}`, kit);
  await mem.set(`dedupe:${FINGERPRINT}`, kit.id);
  return kit;
}

describe("24h cache hit", () => {
  it("recomputes a cached default palette instead of reusing it", async () => {
    const cached = await seed(DEFAULT_PALETTE);
    const kit = await createKit("https://github.com/luciengeorge/haypile");
    expect(kit.reusedFrom).toBe(cached.id);
    expect(kit.brief).toEqual(cached.brief);
    expect(kit.palette).toEqual(REPO_PALETTE);
    expect((await getKit(kit.id))?.palette).toEqual(REPO_PALETTE);
  });

  it("keeps a cached palette that came from real brand colours", async () => {
    await seed(SITE_PALETTE);
    const kit = await createKit("https://github.com/luciengeorge/haypile");
    expect(kit.palette).toEqual(SITE_PALETTE);
  });
});
