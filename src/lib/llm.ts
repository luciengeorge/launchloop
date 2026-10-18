import "server-only";
import { gateway, type GatewayProviderOptions } from "@ai-sdk/gateway";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import type { z } from "zod";
import { env, forceMock } from "./env";
import { deployEnv } from "./deploy-env";
import { addBreadcrumb, captureExceptionThrottled, captureMessage } from "./observability";

/**
 * The only module that talks to an LLM. Every call goes through Vercel AI
 * Gateway via the AI SDK. Authentication is resolved by the gateway provider:
 * AI_GATEWAY_API_KEY if set, otherwise the Vercel OIDC token (the request's
 * x-vercel-oidc-token header on Vercel, or VERCEL_OIDC_TOKEN from `vercel env pull`).
 */
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";
export const DEFAULT_FALLBACK_MODELS = ["openai/gpt-5-mini"];
/** Used for the smaller kit sections, where latency matters more than depth. */
export const DEFAULT_FAST_MODEL = "anthropic/claude-haiku-4.5";
/**
 * Per attempt. A free preview makes two calls (brief, then preview) of up to three attempts each,
 * so the worst case (6 x 45s) still fits the 300s maxDuration on /api/kits with time for ingest.
 */
const ATTEMPT_TIMEOUT_MS = 45_000;

/** Any failure to get usable output from the model. Callers turn this into a friendly message. */
export class LlmError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LlmError";
  }
}

interface GatewayConfig {
  model: string;
  fastModel: string;
  fallbacks: string[];
}

export function gatewayConfig(): GatewayConfig | null {
  if (forceMock || env.llmProvider === "mock") return null;
  // On Vercel the OIDC token arrives per request rather than as an env var.
  const hasCredentials = !!env.aiGatewayApiKey || !!process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL === "1";
  if (!hasCredentials) return null;
  const fallbacks = env.aiGatewayFallbackModels;
  return {
    model: env.aiGatewayModel ?? DEFAULT_MODEL,
    fastModel: process.env.AI_GATEWAY_FAST_MODEL?.trim() || DEFAULT_FAST_MODEL,
    fallbacks:
      fallbacks === undefined
        ? DEFAULT_FALLBACK_MODELS
        : fallbacks === "none"
          ? []
          : fallbacks.split(",").map((m) => m.trim()).filter(Boolean),
  };
}

export const llmLabel = () => {
  const config = gatewayConfig();
  return config ? `gateway:${config.model}` : "mock";
};

/**
 * Per-call output budgets. A JSON answer at every rubric limit measures about 310 tokens for the
 * brief, 80 for the preview, 45 for three taglines, 300-440 for the landing, Product Hunt and X
 * sections and 650 for LinkedIn (3,000 chars), in English. Each budget leaves room for a first
 * attempt that overshoots the limits by half and for denser tokenizers; CJK copy runs about 3x
 * and relies on the doubling retry. Reasoning models (the gpt-5-mini fallback) count reasoning
 * tokens against this budget too, so the retry also covers them.
 */
export const OUTPUT_TOKENS = { brief: 800, preview: 400, kitSection: 1500, linkedin: 2500 } as const;

interface StructuredRequest<T> {
  /** Sent to the model as the output schema. Keep it to types only: counts and lengths belong in `rubric`. */
  schema: z.ZodType<T>;
  system: string;
  user: string;
  /**
   * Template output for mock mode only (local dev and tests: no gateway credentials, LLM_PROVIDER=mock
   * or MOCK_MODE=true). Never served in production or when the gateway fails.
   */
  mock: () => T;
  /** Rubric check (limits, banned phrases). Problems are fed back for another attempt. */
  rubric?: (value: T) => string[];
  /** Output budget for one attempt; see OUTPUT_TOKENS. Doubled for the next attempt if the model hits it. */
  maxOutputTokens: number;
  maxAttempts?: number;
  /** "fast" uses the smaller model for short sections. */
  speed?: "main" | "fast";
  /** Used by the test-only failure switch (MOCK_LLM_FAILURES=true). */
  stage?: "brief" | "preview" | "kit";
}

/**
 * Test-only: with MOCK_LLM_FAILURES=true in mock mode, prompts containing
 * LLMFAIL fail every call and KITFAIL fails full-kit calls, so error states can be tested.
 */
function simulatedFailure(req: StructuredRequest<unknown>): boolean {
  if (process.env.MOCK_LLM_FAILURES !== "true") return false;
  return req.user.includes("LLMFAIL") || (req.stage === "kit" && req.user.includes("KITFAIL"));
}

/** Groups gateway failures for Sentry throttling: "GatewayRateLimitError:429", "TimeoutError", ... */
export function gatewayErrorType(error: unknown): string {
  if (!(error instanceof Error)) return typeof error;
  const status = (error as { statusCode?: unknown }).statusCode;
  return typeof status === "number" ? `${error.name}:${status}` : error.name;
}

/** Generates schema-validated output, checks it against the rubric, and retries with the problems listed. */
export async function generateStructured<T>(req: StructuredRequest<T>): Promise<{ value: T; provider: string }> {
  const config = gatewayConfig();
  if (!config) {
    if (deployEnv() === "production") throw new LlmError("AI Gateway is not configured; template copy is never served in production");
    if (simulatedFailure(req as StructuredRequest<unknown>)) throw new LlmError("Simulated LLM failure");
    return { value: req.mock(), provider: "mock" };
  }
  const model = req.speed === "fast" ? config.fastModel : config.model;
  // The gateway tries these in order when `model` fails: main, then fast, then the configured fallbacks.
  const fallbacks = [...new Set(req.speed === "fast" ? [config.model, ...config.fallbacks] : [config.fastModel, ...config.fallbacks])].filter((m) => m !== model);

  const maxAttempts = req.maxAttempts ?? 3;
  let prompt = req.user;
  let last: { value: T; provider: string } | null = null;
  let lastProblems = "";
  let maxOutputTokens = req.maxOutputTokens;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let problems: string[];
    try {
      const result = await generateText({
        model: gateway(model),
        system: req.system,
        prompt,
        output: Output.object({ schema: req.schema }),
        maxOutputTokens,
        providerOptions: { gateway: { models: fallbacks } satisfies GatewayProviderOptions },
        abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
      last = { value: result.output, provider: `gateway:${result.response.modelId}` };
      problems = req.rubric?.(result.output) ?? [];
      if (problems.length === 0) return last;
    } catch (error) {
      if (!NoObjectGeneratedError.isInstance(error)) {
        // Every model in the chain failed or timed out. No template stands in: the caller reports it honestly.
        const type = gatewayErrorType(error);
        addBreadcrumb({ category: "llm", level: "error", message: "AI Gateway call failed on every model", data: { stage: req.stage, model, fallbacks, type } });
        captureExceptionThrottled(`llm.gateway:${type}`, error, { stage: "llm.gateway", llmStage: req.stage, model, fallbacks });
        throw new LlmError(`Gateway call failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
      if (error.finishReason === "length") {
        captureMessage("LLM output hit maxOutputTokens; retrying with double the budget", { stage: req.stage, model, maxOutputTokens });
        maxOutputTokens *= 2;
        problems = ["Your answer was cut off before the JSON was complete. Return the complete JSON and keep every field within its limit."];
      } else {
        problems = [`Output did not match the required JSON shape (${error.cause instanceof Error ? error.cause.message : "invalid JSON"}).`];
      }
    }
    lastProblems = problems.join("; ");
    prompt = `${req.user}\n\nYour previous answer had these problems. Fix all of them and return the full corrected JSON:\n- ${problems.join("\n- ")}`;
  }

  if (last) {
    captureMessage("LLM output still failed the rubric; falling back to automatic fixes", { problems: lastProblems });
    return last;
  }
  const error = new LlmError(`LLM returned unusable output after ${maxAttempts} attempts: ${lastProblems}`);
  captureExceptionThrottled(`llm.unusable:${req.stage ?? "unknown"}`, error, { stage: "llm.unusable", llmStage: req.stage, model });
  throw error;
}
