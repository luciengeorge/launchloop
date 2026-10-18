import { APICallError } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "./memory-store";
import type { Kit } from "@/lib/schema";

const kv = vi.hoisted(() => ({ store: undefined as unknown }));
const ai = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock("ai", async (importOriginal) => ({ ...(await importOriginal<typeof import("ai")>()), generateText: ai.generateText }));
vi.mock("@/lib/store", () => ({ store: () => kv.store }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock("@/lib/analytics-server", () => ({ captureServerEvent: vi.fn(), eventUuid: (seed: string) => `uuid:${seed}` }));
vi.mock("@/lib/zip", () => ({ buildKitZip: async () => new Uint8Array([1, 2, 3]), zipFileName: () => "shelfie-launch-kit.zip" }));
vi.mock("@/lib/email", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/email")>()), sendEmail: vi.fn(async () => ({ id: "email_1", mock: true })) }));

vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
vi.stubEnv("LLM_PROVIDER", "");
vi.stubEnv("MOCK_MODE", "");
const { captureException } = await import("@/lib/observability");
const { captureServerEvent } = await import("@/lib/analytics-server");
const { sendEmail } = await import("@/lib/email");
const { MAX_ATTEMPTS, RETRY_BACKOFF_MS, fulfilKit } = await import("@/lib/fulfil");
const { getDraft } = await import("@/lib/generation");
const zipRoute = await import("@/app/api/kits/[id]/zip/route");

const KIT_ID = "kit_0123456789abcdef";
const kit: Kit = {
  id: KIT_ID,
  createdAt: "2026-10-18T08:00:00.000Z",
  status: "paid",
  source: { input: "https://github.com/acme/shelfie", repoUrl: "https://github.com/acme/shelfie", commitsAnalysed: 20, readmeFound: true, packageJsonFound: true, pageScraped: false, warnings: [] },
  brief: { name: "Shelfie", oneLiner: "Search every screenshot by the words in it", audience: "designers", problem: "Screenshots pile up.", features: ["OCR", "Search", "Offline"], proofPoints: [], stack: ["Swift"], tone: "plain", repoUrl: "https://github.com/acme/shelfie" },
  palette: { background: "#ffffff", foreground: "#111111", accent: "#f2541b", accentForeground: "#ffffff", muted: "#71717a", source: "default" },
  preview: { tagline: "Find any screenshot by the words in it", xPost: "I built Shelfie: search screenshots by their text." },
  digest: "README: Shelfie finds screenshots by their text.",
  llm: "gateway:anthropic/claude-sonnet-4.5",
  paid: true,
  email: "buyer@example.com",
  ownerEmail: "buyer@example.com",
  paymentRef: "cs_test_0123456789abcdef",
  attempts: 0,
};

/** Text only the template writer produces. None of it may end up in a paid kit. */
const TEMPLATE_MARKERS = [/Hey Product Hunt/, /#buildinpublic/, /I just launched/, /Made by an indie maker/, /What it does today:/];

const SECTIONS: Record<string, unknown> = {
  "landing page copy": {
    headline: "Find any screenshot in seconds",
    subheadline: "Shelfie reads the text in every screenshot so you can search them like notes.",
    cta: "Get Shelfie",
    features: [
      { title: "Text search", description: "Type a word and see every screenshot that contains it." },
      { title: "Works offline", description: "Everything runs on your Mac, nothing leaves it." },
      { title: "Smart folders", description: "Group screenshots by app or by date automatically." },
    ],
    metaTitle: "Shelfie: search your screenshots",
    metaDescription: "Shelfie reads the text in your screenshots so you can find any of them by searching.",
  },
  "Product Hunt post": {
    name: "Shelfie",
    tagline: "Find any screenshot by the words in it",
    description: "Shelfie reads the text in every screenshot on your Mac so you can search them like notes.",
    makerComment: "I take dozens of screenshots a day and could never find the right one, so I built Shelfie. What would make it useful for you?",
    topics: ["Productivity", "Mac"],
  },
  "X launch thread": { posts: ["I built Shelfie: search screenshots by their text.", "Screenshots pile up fast.", "Shelfie reads them all.", "It runs offline.", "Try it and tell me what's missing: https://shelfie.app"] },
  "LinkedIn launch post": { post: "I kept losing screenshots, so I built Shelfie.\n\nIt reads the text in every screenshot so you can search for it.\n\nWhat would you use it for?" },
};

const gatewayDown = () => new APICallError({ message: "Insufficient credits", url: "https://ai-gateway.vercel.sh/v1/ai/language-model", requestBodyValues: {}, statusCode: 402 });
const sectionFor = (prompt: string) => {
  const entry = Object.entries(SECTIONS).find(([label]) => prompt.includes(label));
  if (!entry) throw new Error(`No fixture for prompt: ${prompt.slice(-120)}`);
  return { output: entry[1], response: { modelId: "anthropic/claude-haiku-4.5" } };
};

let mem: MemoryStore;
const storedKit = () => mem.get<Kit>(`kit:${KIT_ID}`);
/** Runs fulfilment to the end, fast-forwarding the backoff waits. */
async function fulfil() {
  const job = fulfilKit(KIT_ID);
  await vi.runAllTimersAsync();
  await job;
}

beforeEach(async () => {
  mem = new MemoryStore();
  kv.store = mem;
  ai.generateText.mockReset();
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(new Date("2026-10-18T09:00:00Z"));
  await mem.set(`kit:${KIT_ID}`, kit);
});

afterEach(() => vi.useRealTimers());

describe("paid kit when every attempt fails", () => {
  it("retries with backoff, then marks the kit failed with refund_needed, emails the buyer once and delivers no template copy", async () => {
    const callTimes: number[] = [];
    ai.generateText.mockImplementation(async () => {
      callTimes.push(Date.now());
      throw gatewayDown();
    });
    await fulfil();

    const failed = await storedKit();
    expect(failed).toMatchObject({ status: "failed", attempts: MAX_ATTEMPTS, refund_needed: true, error: "We couldn't finish writing your kit." });
    expect(failed?.failedAt).toBeTruthy();
    expect(failed?.content).toBeUndefined();

    // 4 sections per attempt, with the backoff waits between attempts.
    expect(ai.generateText).toHaveBeenCalledTimes(4 * MAX_ATTEMPTS);
    const attemptStarts = [callTimes[0], callTimes[4], callTimes[8]];
    expect(attemptStarts[1] - attemptStarts[0]).toBeGreaterThanOrEqual(RETRY_BACKOFF_MS[0]);
    expect(attemptStarts[2] - attemptStarts[1]).toBeGreaterThanOrEqual(RETRY_BACKOFF_MS[1]);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const email = vi.mocked(sendEmail).mock.calls[0][0];
    expect(email.to).toBe("buyer@example.com");
    expect(email.subject).toBe("We hit a problem generating your Shelfie launch kit");
    expect(email.text).toMatch(/full refund/);
    expect(email.attachments).toBeUndefined();
    expect(failed?.failureEmailedAt).toBeTruthy();

    expect(captureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ stage: "fulfil.final_failure", kitId: KIT_ID, refund_needed: true }));
    expect(captureServerEvent).toHaveBeenCalledWith("kit_generation_failed", expect.objectContaining({ properties: expect.objectContaining({ plan: "kit", kitId: KIT_ID, attempts: 3, refund_needed: true }) }));

    // Nothing to deliver: no sections, no ZIP, and nothing template-made in the record.
    expect((await getDraft(KIT_ID)).sections).toEqual({});
    const zip = await zipRoute.GET(new Request(`http://localhost/api/kits/${KIT_ID}/zip`), { params: Promise.resolve({ id: KIT_ID }) });
    expect(zip.status).toBe(409);
    for (const marker of TEMPLATE_MARKERS) expect(JSON.stringify(failed)).not.toMatch(marker);

    // A later trigger (status poll, webhook) neither retries nor emails again.
    await fulfil();
    expect(ai.generateText).toHaveBeenCalledTimes(4 * MAX_ATTEMPTS);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("a section the model keeps leaving incomplete fails the kit rather than being padded with template copy", async () => {
    ai.generateText.mockImplementation(async ({ prompt }: { prompt: string }) =>
      prompt.includes("X launch thread") ? { output: { posts: ["Only one post."] }, response: { modelId: "anthropic/claude-sonnet-4.5" } } : sectionFor(prompt),
    );
    await fulfil();
    const failed = await storedKit();
    expect(failed).toMatchObject({ status: "failed", refund_needed: true });
    expect(failed?.content).toBeUndefined();
    expect((await getDraft(KIT_ID)).sections.xThread).toBeUndefined();
  });
});

describe("paid kit success paths", () => {
  it("is unchanged when the first attempt works: ready with the model's copy and the kit-ready email", async () => {
    ai.generateText.mockImplementation(async ({ prompt }: { prompt: string }) => sectionFor(prompt));
    await fulfil();
    const ready = await storedKit();
    expect(ready).toMatchObject({ status: "ready", attempts: 1 });
    expect(ready?.refund_needed).toBeUndefined();
    expect(ready?.content?.landing.headline).toBe("Find any screenshot in seconds");
    expect(ready?.content?.xThread).toHaveLength(5);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0].subject).toBe("Payment received: your Shelfie launch kit is ready");
    expect(captureServerEvent).not.toHaveBeenCalled();
  });

  it("recovers on a later attempt without flagging a refund", async () => {
    let calls = 0;
    ai.generateText.mockImplementation(async ({ prompt }: { prompt: string }) => {
      if (calls++ < 4) throw gatewayDown();
      return sectionFor(prompt);
    });
    await fulfil();
    const ready = await storedKit();
    expect(ready).toMatchObject({ status: "ready", attempts: 2 });
    expect(ready?.refund_needed).toBeUndefined();
    expect(vi.mocked(sendEmail).mock.calls.map(([e]) => e.subject)).toEqual(["Payment received: your Shelfie launch kit is ready"]);
  });
});
