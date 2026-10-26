import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
const ai = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock("ai", async (importOriginal) => ({ ...(await importOriginal<typeof import("ai")>()), generateText: ai.generateText }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn(), addBreadcrumb: vi.fn() }));

vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
vi.stubEnv("LLM_PROVIDER", "");
vi.stubEnv("MOCK_MODE", "");
const { buildBrief } = await import("@/lib/brief");
const { generatePreview, generateTaglines, generateKitSection, KIT_SECTIONS } = await import("@/lib/copy");
const { ingest } = await import("@/lib/ingest");
const { NO_DASHES_RULE } = await import("@/lib/llm");
const { getKit, saveKit } = await import("@/lib/kits");
const { getDraft } = await import("@/lib/generation");

const DASHES = /[\u2013\u2014]/;
const ok = (output: unknown) => ({ output, response: { modelId: "anthropic/claude-sonnet-4.5" } });

/** A model that puts an em or en dash in every single field it writes, picked by what the prompt asks for. */
function dashyModel({ prompt }: { prompt: string }) {
  if (prompt.includes("Write a product brief")) {
    return ok({
      name: "Notely\u2014Pro",
      oneLiner: "Reserved domain for docs and examples\u2014use without asking",
      audience: "Indie makers \u2013 and small teams",
      problem: "Notes pile up\u2014and you can't find the one you need.",
      features: ["Search \u2014 every note", "Sync in 2\u20133 seconds", "Works offline\u2014always"],
      tone: "plain \u2013 practical",
    });
  }
  if (prompt.includes('"taglines"')) return ok({ taglines: ["Notes\u2014found in seconds", "Search \u2013 every note you wrote", "Your notes\u2014without the mess"] });
  if (prompt.includes("- tagline:")) return ok({ tagline: "Find any note\u2014fast", xPost: "I built Notely \u2014 search every note by its words. https://notely.app" });
  if (prompt.includes("Write landing page copy")) {
    return ok({
      headline: "Every note\u2014found",
      subheadline: "Search your notes \u2013 in seconds",
      cta: "Try it\u2014free",
      features: [1, 2, 3].map((i) => ({ title: `Feature ${i}\u2014fast`, description: `Does thing ${i} \u2013 without setup` })),
      metaTitle: "Notely\u2014search notes",
      metaDescription: "Search notes \u2014 fast and offline",
    });
  }
  if (prompt.includes("Write the Product Hunt post")) {
    return ok({ name: "Notely\u2014Pro", tagline: "Find any note\u2014fast", description: "Search \u2013 every note.", makerComment: "I built this\u2014for me. 10\u201320% faster.", topics: ["Productivity\u2014Notes"] });
  }
  if (prompt.includes("Write an X launch thread")) return ok({ posts: [1, 2, 3, 4, 5].map((i) => `Post ${i}\u2014with a dash \u2013 or two`) });
  if (prompt.includes("Write a LinkedIn launch post")) return ok({ post: "I shipped Notely\u2014today.\n\u2014 Search\n\u2013 Sync \u2014 offline" });
  throw new Error(`unexpected prompt: ${prompt.slice(0, 80)}`);
}

beforeEach(() => {
  kv.store = new MemoryStore();
  ai.generateText.mockReset();
  ai.generateText.mockImplementation(async (args: { prompt: string }) => dashyModel(args));
});

describe("dash punctuation in generated copy", () => {
  it("no em or en dash survives in any field of the brief, preview, taglines or full kit", async () => {
    const { brief } = await buildBrief(await ingest("sample"));
    const { preview } = await generatePreview(brief);
    const { taglines } = await generateTaglines(brief);
    const sections = await Promise.all(KIT_SECTIONS.map(async (s) => (await generateKitSection(s, brief, preview, "digest")).content));

    const everything = { brief, preview, taglines, sections };
    expect(JSON.stringify(everything)).not.toMatch(DASHES);
    expect(brief.oneLiner).toBe("Reserved domain for docs and examples: use without asking");
    expect(brief.features).toContain("Sync in 2-3 seconds");
    expect(preview.tagline).toBe("Find any note, fast");
    // Every section really came from the dashy model, not a template.
    expect(sections.find((s) => s.linkedin)?.linkedin).toBe("I shipped Notely, today.\n- Search\n- Sync, offline");
    expect(sections.find((s) => s.productHunt)?.productHunt?.makerComment).toBe("I built this, for me. 10-20% faster.");
  });

  it("every prompt that writes copy tells the model not to use em or en dashes", async () => {
    const { brief } = await buildBrief(await ingest("sample"));
    const { preview } = await generatePreview(brief);
    await generateTaglines(brief);
    for (const s of KIT_SECTIONS) await generateKitSection(s, brief, preview, "digest");
    const systems = ai.generateText.mock.calls.map(([args]) => (args as { system: string }).system);
    expect(systems.length).toBeGreaterThanOrEqual(7);
    for (const system of systems) expect(system).toContain(NO_DASHES_RULE);
  });

  it("kits and draft sections stored before this change come back clean when read", async () => {
    const id = "AKWq8__P15_kweHmfXX_Uw";
    await saveKit({
      id,
      createdAt: new Date().toISOString(),
      status: "ready",
      paid: true,
      attempts: 1,
      source: { input: "https://example.com", siteUrl: "https://example.com", commitsAnalysed: 0, readmeFound: false, packageJsonFound: false, pageScraped: true, warnings: [] },
      brief: { name: "Example", oneLiner: "Reserved domain for docs and examples\u2014use without asking", audience: "docs writers", problem: "x", features: ["a\u2014b c d"], proofPoints: [], stack: [], tone: "plain", url: "https://example.com" },
      palette: { background: "#fff", foreground: "#000", accent: "#333", accentForeground: "#fff", muted: "#666", source: "default" },
      visuals: {},
      preview: { tagline: "Docs and examples\u2014no permission needed", xPost: "Example \u2013 for docs" },
      digest: "",
      llm: "gateway:x",
      checklist: ["Post it\u2014today"],
    } as never);
    const kit = (await getKit(id))!;
    expect(JSON.stringify({ brief: kit.brief, preview: kit.preview, checklist: kit.checklist })).not.toMatch(DASHES);
    expect(kit.preview.tagline).toBe("Docs and examples: no permission needed");
    expect(kit.brief.url).toBe("https://example.com");

    await (kv.store as MemoryStore).set(`kitdraft:${id}:linkedin`, { linkedin: "Launch day\u2014finally" });
    expect((await getDraft(id)).sections.linkedin).toBe("Launch day, finally");
  });
});
