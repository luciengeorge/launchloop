import "server-only";
import type { z } from "zod";
import { env, forceMock } from "./env";
import { captureMessage } from "./observability";

/**
 * The only module that talks to an LLM. Swap providers with LLM_PROVIDER
 * (openai | anthropic | mock). "openai" speaks the OpenAI chat-completions
 * protocol, so LLM_BASE_URL also covers OpenRouter, Groq, Together, Ollama, etc.
 */
export interface LLMProvider {
  id: string;
  complete(input: { system: string; user: string }): Promise<string>;
}

class OpenAICompatible implements LLMProvider {
  readonly id: string;
  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string,
  ) {
    this.id = `openai:${model}`;
  }

  async complete({ system, user }: { system: string; user: string }) {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`LLM request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as { choices: { message: { content: string | null } }[] };
    return body.choices[0]?.message.content ?? "";
  }
}

class Anthropic implements LLMProvider {
  readonly id: string;
  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string,
  ) {
    this.id = `anthropic:${model}`;
  }

  async complete({ system, user }: { system: string; user: string }) {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: { "x-api-key": this.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.7,
        system: `${system}\nRespond with a single JSON object and nothing else.`,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`LLM request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as { content: { type: string; text?: string }[] };
    return body.content.map((c) => c.text ?? "").join("");
  }
}

export function getProvider(): LLMProvider | null {
  if (forceMock) return null;
  const configured = env.llmProvider?.toLowerCase();
  if (configured === "mock" || !env.llmApiKey) return null;
  const provider = configured ?? (process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY ? "anthropic" : "openai");
  if (provider === "anthropic") {
    return new Anthropic(env.llmApiKey, env.llmModel ?? "claude-haiku-4-5", env.llmBaseUrl ?? "https://api.anthropic.com");
  }
  return new OpenAICompatible(env.llmApiKey, env.llmModel ?? "gpt-4.1-mini", env.llmBaseUrl ?? "https://api.openai.com/v1");
}

export const llmLabel = () => getProvider()?.id ?? "mock";

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("No JSON object in LLM output");
  return JSON.parse(candidate.slice(start, end + 1));
}

interface StructuredRequest<T> {
  schema: z.ZodType<T>;
  system: string;
  user: string;
  /** Deterministic output used when no provider is configured. */
  mock: () => T;
  /** Rubric check (limits, banned phrases). Problems are fed back for one more attempt. */
  rubric?: (value: T) => string[];
  maxAttempts?: number;
}

/** Asks for JSON, validates it against the schema and rubric, and retries with the problems listed. */
export async function generateStructured<T>(req: StructuredRequest<T>): Promise<{ value: T; provider: string }> {
  const provider = getProvider();
  if (!provider) return { value: req.mock(), provider: "mock" };

  const maxAttempts = req.maxAttempts ?? 3;
  let user = req.user;
  let lastValid: T | null = null;
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await provider.complete({ system: req.system, user });
    let problems: string[];
    try {
      const parsed = req.schema.safeParse(extractJson(raw));
      if (!parsed.success) {
        problems = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`);
      } else {
        lastValid = parsed.data;
        problems = req.rubric?.(parsed.data) ?? [];
        if (problems.length === 0) return { value: parsed.data, provider: provider.id };
      }
    } catch (error) {
      problems = [`Output was not valid JSON (${(error as Error).message}).`];
    }
    lastError = problems.join("; ");
    user = `${req.user}\n\nYour previous answer had these problems. Fix all of them and return the full corrected JSON:\n- ${problems.join("\n- ")}`;
  }

  if (lastValid) {
    captureMessage("LLM output still failed the rubric; falling back to automatic fixes", { problems: lastError });
    return { value: lastValid, provider: provider.id };
  }
  throw new Error(`LLM returned unusable output after ${maxAttempts} attempts: ${lastError}`);
}
