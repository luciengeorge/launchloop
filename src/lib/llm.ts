import "server-only";
import { gateway, type GatewayProviderOptions } from "@ai-sdk/gateway";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import type { z } from "zod";
import { env, forceMock } from "./env";
import { captureException, captureMessage } from "./observability";

/**
 * The only module that talks to an LLM. Every call goes through Vercel AI
 * Gateway via the AI SDK. Authentication is resolved by the gateway provider:
 * AI_GATEWAY_API_KEY if set, otherwise the Vercel OIDC token (the request's
 * x-vercel-oidc-token header on Vercel, or VERCEL_OIDC_TOKEN from `vercel env pull`).
 */
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";
export const DEFAULT_FALLBACK_MODELS = ["openai/gpt-5-mini"];

interface GatewayConfig {
  model: string;
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

interface StructuredRequest<T> {
  /** Sent to the model as the output schema. Keep it to types only: counts and lengths belong in `rubric`. */
  schema: z.ZodType<T>;
  system: string;
  user: string;
  /** Deterministic output used when no gateway credentials are configured. */
  mock: () => T;
  /** Rubric check (limits, banned phrases). Problems are fed back for another attempt. */
  rubric?: (value: T) => string[];
  maxAttempts?: number;
  /** For free, non-critical steps: serve the mock output if the gateway is down instead of failing. */
  mockOnGatewayError?: boolean;
}

/** Generates schema-validated output, checks it against the rubric, and retries with the problems listed. */
export async function generateStructured<T>(req: StructuredRequest<T>): Promise<{ value: T; provider: string }> {
  const config = gatewayConfig();
  if (!config) return { value: req.mock(), provider: "mock" };

  const maxAttempts = req.maxAttempts ?? 3;
  let prompt = req.user;
  let last: { value: T; provider: string } | null = null;
  let lastProblems = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let problems: string[];
    try {
      const result = await generateText({
        model: gateway(config.model),
        system: req.system,
        prompt,
        output: Output.object({ schema: req.schema }),
        providerOptions: { gateway: { models: config.fallbacks } satisfies GatewayProviderOptions },
        abortSignal: AbortSignal.timeout(90_000),
      });
      last = { value: result.output, provider: `gateway:${result.response.modelId}` };
      problems = req.rubric?.(result.output) ?? [];
      if (problems.length === 0) return last;
    } catch (error) {
      if (!NoObjectGeneratedError.isInstance(error)) {
        if (req.mockOnGatewayError) {
          captureException(error, { stage: "llm.gateway", model: config.model, fallback: "mock" });
          return { value: req.mock(), provider: "mock (gateway unavailable)" };
        }
        throw error;
      }
      problems = [`Output did not match the required JSON shape (${error.cause instanceof Error ? error.cause.message : "invalid JSON"}).`];
    }
    lastProblems = problems.join("; ");
    prompt = `${req.user}\n\nYour previous answer had these problems. Fix all of them and return the full corrected JSON:\n- ${problems.join("\n- ")}`;
  }

  if (last) {
    captureMessage("LLM output still failed the rubric; falling back to automatic fixes", { problems: lastProblems });
    return last;
  }
  throw new Error(`LLM returned unusable output after ${maxAttempts} attempts: ${lastProblems}`);
}
