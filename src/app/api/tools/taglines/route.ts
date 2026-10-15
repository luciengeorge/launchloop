import { generateTaglines } from "@/lib/copy";
import { kitErrorBody } from "@/lib/errors";
import { IngestError } from "@/lib/ingest";
import { briefFor } from "@/lib/kits";
import { LlmError } from "@/lib/llm";
import { captureException } from "@/lib/observability";
import { freePreviewLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/** Free tagline checker, generate mode: repo or URL → three Product Hunt taglines. Shares the free preview's limits. */
export async function POST(req: Request) {
  const limit = await freePreviewLimit(req);
  if (!limit.ok) {
    return Response.json(kitErrorBody("rate_limited"), { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  let url: unknown;
  try {
    ({ url } = (await req.json()) as { url?: unknown });
  } catch {
    return Response.json(kitErrorBody("invalid_url", "Send JSON like { \"url\": \"https://github.com/you/app\" }."), { status: 400 });
  }
  if (typeof url !== "string" || !url.trim()) {
    return Response.json(kitErrorBody("invalid_url", "Paste a GitHub repo URL or your live site URL."), { status: 400 });
  }

  try {
    const brief = await briefFor(url);
    const { taglines } = await generateTaglines(brief);
    return Response.json({ name: brief.name, taglines });
  } catch (error) {
    if (error instanceof IngestError) return Response.json(kitErrorBody(error.code, error.userMessage), { status: 422 });
    captureException(error, { stage: "api.tools.taglines", url });
    if (error instanceof LlmError) return Response.json(kitErrorBody("llm_failed"), { status: 503 });
    return Response.json(kitErrorBody("unknown"), { status: 500 });
  }
}
