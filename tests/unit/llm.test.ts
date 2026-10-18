import { NoObjectGeneratedError } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const ai = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock("ai", async (importOriginal) => ({ ...(await importOriginal<typeof import("ai")>()), generateText: ai.generateText }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn() }));

vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
vi.stubEnv("LLM_PROVIDER", "");
vi.stubEnv("MOCK_MODE", "");
const { OUTPUT_TOKENS, generateStructured } = await import("@/lib/llm");

const ok = (output: unknown) => ({ output, response: { modelId: "anthropic/claude-sonnet-4.5" } });
const truncated = () =>
  new NoObjectGeneratedError({
    message: "No object generated: could not parse the response.",
    text: '{"tagline":"Half a',
    response: { id: "r", timestamp: new Date(), modelId: "anthropic/claude-sonnet-4.5" },
    usage: { inputTokens: 10, outputTokens: 400, totalTokens: 410 } as never,
    finishReason: "length",
  });

const request = { schema: z.object({ tagline: z.string() }), system: "s", user: "u", mock: () => ({ tagline: "mock" }), maxOutputTokens: OUTPUT_TOKENS.preview };

beforeEach(() => ai.generateText.mockReset());

describe("maxOutputTokens", () => {
  it("sends the call's budget to the model", async () => {
    ai.generateText.mockResolvedValueOnce(ok({ tagline: "Launch copy from your repo" }));
    const { value } = await generateStructured(request);
    expect(value.tagline).toBe("Launch copy from your repo");
    expect(ai.generateText.mock.calls[0][0].maxOutputTokens).toBe(400);
  });

  it("tells the gateway not to route to providers that train on prompts", async () => {
    ai.generateText.mockResolvedValueOnce(ok({ tagline: "Launch copy from your repo" }));
    await generateStructured(request);
    expect(ai.generateText.mock.calls[0][0].providerOptions.gateway).toMatchObject({ disallowPromptTraining: true });
  });

  it("doubles the budget after an answer cut off at the limit", async () => {
    ai.generateText.mockRejectedValueOnce(truncated()).mockResolvedValueOnce(ok({ tagline: "Launch copy from your repo" }));
    const { value } = await generateStructured(request);
    expect(value.tagline).toBe("Launch copy from your repo");
    expect(ai.generateText.mock.calls.map(([args]) => args.maxOutputTokens)).toEqual([400, 800]);
    expect(ai.generateText.mock.calls[1][0].prompt).toContain("cut off");
  });
});
