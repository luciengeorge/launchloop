import { APICallError } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
const ai = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock("ai", async (importOriginal) => ({ ...(await importOriginal<typeof import("ai")>()), generateText: ai.generateText }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn() }) }));
vi.mock("@/lib/auth", () => ({ ANON_KITS_COOKIE: "ll_anon_kits", getSession: async () => null, readAnonKits: () => [], secureCookies: () => false }));
vi.mock("@/lib/generation", () => ({ speculateDraft: vi.fn(async () => "capped"), copyDraft: vi.fn() }));

vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
vi.stubEnv("LLM_PROVIDER", "");
vi.stubEnv("MOCK_MODE", "");
const { addBreadcrumb, captureExceptionThrottled } = await import("@/lib/observability");
const kitsRoute = await import("@/app/api/kits/route");
const taglinesRoute = await import("@/app/api/tools/taglines/route");

/** Phrases only the template writers produce: none may reach a visitor as if the AI wrote it. */
const TEMPLATE_MARKERS = [/I just launched/, /helps you get more done with less fuss/, /Doing this by hand is slow/, /friendly, specific, no hype/, /Does one job well, without the setup/, /Snapshelf/i];

const post = (handler: (req: Request) => Promise<Response>, path: string, url: string, ndjson = false) =>
  handler(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.50", ...(ndjson ? { Accept: "application/x-ndjson" } : {}) },
      body: JSON.stringify({ url }),
    }),
  );

const gatewayDown = () => new APICallError({ message: "All providers failed", url: "https://ai-gateway.vercel.sh/v1/ai/language-model", requestBodyValues: {}, statusCode: 503 });
const ok = (output: unknown) => ({ output, response: { modelId: "anthropic/claude-sonnet-4.5" } });
const BRIEF = { name: "Shelfie", oneLiner: "Search every screenshot you've taken by the words in it", audience: "designers and developers", problem: "Screenshots pile up and you can't find the one you need.", features: ["OCR on every screenshot", "Instant search", "Works offline"], tone: "plain, practical" };
const PREVIEW = { tagline: "Find any screenshot by the words in it", xPost: "I built Shelfie: search every screenshot by its text. https://shelfie.app" };

let mem: MemoryStore;
beforeEach(() => {
  mem = new MemoryStore();
  kv.store = mem;
  ai.generateText.mockReset();
});

describe("free preview when every model fails", () => {
  it("returns 503 ai_busy, saves no kit and shows no template copy", async () => {
    ai.generateText.mockRejectedValue(gatewayDown());
    const res = await post(kitsRoute.POST, "/api/kits", "sample");
    expect(res.status).toBe(503);
    const raw = await res.text();
    expect(JSON.parse(raw)).toMatchObject({ code: "ai_busy", error: "Our AI is busy, try again in a minute." });
    for (const marker of TEMPLATE_MARKERS) expect(raw).not.toMatch(marker);
    expect(mem.keys().filter((k) => k.startsWith("kit:") || k.startsWith("dedupe:"))).toEqual([]);
  });

  it("asks the gateway for main, then fast, then the fallback model, and reports once with a breadcrumb", async () => {
    ai.generateText.mockRejectedValue(gatewayDown());
    await post(kitsRoute.POST, "/api/kits", "sample");
    const { model, providerOptions } = ai.generateText.mock.calls[0][0];
    expect(model.modelId).toBe("anthropic/claude-sonnet-4.5");
    expect(providerOptions.gateway.models).toEqual(["anthropic/claude-haiku-4.5", "openai/gpt-5-mini"]);
    expect(addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ category: "llm", message: "AI Gateway call failed on every model" }));
    expect(captureExceptionThrottled).toHaveBeenCalledWith("llm.gateway:AI_APICallError:503", expect.any(Error), expect.objectContaining({ stage: "llm.gateway" }));
  });

  it("streams an ai_busy error event, not a done event", async () => {
    ai.generateText.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));
    const res = await post(kitsRoute.POST, "/api/kits", "sample", true);
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l) as { type: string; code?: string });
    expect(lines.at(-1)).toMatchObject({ type: "error", code: "ai_busy", status: 503 });
    expect(lines.some((l) => l.type === "done")).toBe(false);
  });

  it("a brief the model keeps returning empty is an error, not filled with canned text", async () => {
    ai.generateText.mockResolvedValue(ok({ ...BRIEF, audience: "", problem: " ", tone: "" }));
    const res = await post(kitsRoute.POST, "/api/kits", "sample");
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("ai_busy");
    expect(ai.generateText).toHaveBeenCalledTimes(3);
  });

  it("the tagline generator returns ai_busy instead of template taglines", async () => {
    ai.generateText.mockRejectedValue(gatewayDown());
    const res = await post(taglinesRoute.POST, "/api/tools/taglines", "sample");
    expect(res.status).toBe(503);
    const raw = await res.text();
    expect(JSON.parse(raw).code).toBe("ai_busy");
    for (const marker of TEMPLATE_MARKERS) expect(raw).not.toMatch(marker);
  });
});

describe("free preview success path", () => {
  it("is unchanged: 201 and the kit holds the model's brief and preview", async () => {
    ai.generateText.mockImplementation(async ({ prompt }: { prompt: string }) => ok(prompt.includes("Write a product brief") ? BRIEF : PREVIEW));
    const res = await post(kitsRoute.POST, "/api/kits", "sample");
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };
    const kit = await mem.get<{ brief: typeof BRIEF; preview: typeof PREVIEW; llm: string }>(`kit:${id}`);
    expect(kit?.brief).toMatchObject(BRIEF);
    expect(kit?.preview).toEqual(PREVIEW);
    expect(kit?.llm).toBe("gateway:anthropic/claude-sonnet-4.5");
    expect(ai.generateText).toHaveBeenCalledTimes(2);
  });
});
