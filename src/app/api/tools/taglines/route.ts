import { generateTaglines } from "@/lib/copy";
import { kitErrorBody } from "@/lib/errors";
import { IngestError } from "@/lib/ingest";
import { briefFor } from "@/lib/kits";
import { LlmError } from "@/lib/llm";
import { captureException } from "@/lib/observability";
import { freePreviewGate } from "@/lib/rate-limit";

export const maxDuration = 300;

/** Free tagline checker, generate mode: repo or URL → three Product Hunt taglines. Shares the free preview's limits. */
export async function POST(req: Request) {
  let url: unknown;
  try {
    ({ url } = (await req.json()) as { url?: unknown });
  } catch {
    return Response.json(kitErrorBody("invalid_url", "Send JSON like { \"url\": \"https://github.com/you/app\" }."), { status: 400 });
  }
  if (typeof url !== "string" || !url.trim()) {
    return Response.json(kitErrorBody("invalid_url", "Paste a GitHub repo URL or your live site URL."), { status: 400 });
  }
  const gate = await freePreviewGate(req, url);
  if (gate.refused) return gate.refused;

  let briefDone = false;
  try {
    const brief = await briefFor(url);
    briefDone = true;
    const { taglines } = await generateTaglines(brief);
    return Response.json({ name: brief.name, taglines });
  } catch (error) {
    // Same rule as the preview: no model call completed, so it doesn't count.
    if (!briefDone) await gate.slot.refund();
    if (error instanceof IngestError) return Response.json(kitErrorBody(error.code, error.userMessage), { status: 422 });
    // llm.ts already reported it (throttled).
    if (error instanceof LlmError) return Response.json(kitErrorBody("ai_busy"), { status: 503 });
    captureException(error, { stage: "api.tools.taglines", url });
    return Response.json(kitErrorBody("unknown"), { status: 500 });
  }
}
