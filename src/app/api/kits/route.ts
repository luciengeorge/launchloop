import { IngestError } from "@/lib/ingest";
import { createKit } from "@/lib/kits";
import { captureException } from "@/lib/observability";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const PREVIEWS_PER_HOUR = Number(process.env.PREVIEW_RATE_LIMIT_PER_HOUR ?? 12);

export async function POST(req: Request) {
  const limit = rateLimit(`kits:${clientIp(req)}`, PREVIEWS_PER_HOUR, 60 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: "You've made a lot of previews this hour. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let url: unknown;
  try {
    ({ url } = (await req.json()) as { url?: unknown });
  } catch {
    return Response.json({ error: "Send JSON like { \"url\": \"https://github.com/you/app\" }." }, { status: 400 });
  }
  if (typeof url !== "string" || !url.trim()) {
    return Response.json({ error: "Paste a public GitHub repo URL or your live site URL." }, { status: 400 });
  }

  try {
    const kit = await createKit(url);
    return Response.json({ id: kit.id, url: `/kit/${kit.id}` }, { status: 201 });
  } catch (error) {
    if (error instanceof IngestError) return Response.json({ error: error.userMessage }, { status: 422 });
    captureException(error, { stage: "api.kits.create", url });
    return Response.json({ error: "Something went wrong reading your app. Please try again." }, { status: 500 });
  }
}
