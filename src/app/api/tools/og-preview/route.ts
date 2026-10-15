import { kitErrorBody, type KitErrorCode } from "@/lib/errors";
import { IngestError } from "@/lib/ingest";
import { captureException } from "@/lib/observability";
import { previewOg } from "@/lib/og-preview";
import { ogPreviewLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

/** The kit's fixes suggest pasting a repo instead; here only a live page makes sense. */
const PAGE_FIXES: Partial<Record<KitErrorCode, string>> = {
  invalid_url: "Paste the full address of a live page, like https://your-app.com.",
  site_unreachable: "Check the address is spelled right and the page is live.",
  site_timeout: "Check it loads in your browser and try again. Slow pages often preview badly everywhere.",
  site_http_error: "Check the URL opens in a private window. Crawlers get the same error, so this link won't preview anywhere.",
  site_not_html: "Paste the URL of a web page, like your homepage, not a file or an API endpoint.",
};

const errorBody = (error: IngestError) => {
  const body = kitErrorBody(error.code, error.userMessage);
  return { ...body, fix: PAGE_FIXES[error.code] ?? body.fix };
};

/** Free OG preview tool: live URL → its Open Graph tags, the share image's real size, and a checklist. No sign-up, no LLM. */
export async function POST(req: Request) {
  const limit = await ogPreviewLimit(req);
  if (!limit.ok) {
    return Response.json(
      { error: "You've previewed a lot of links in a short time.", code: "rate_limited", fix: "Wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let url: unknown;
  try {
    ({ url } = (await req.json()) as { url?: unknown });
  } catch {
    return Response.json(kitErrorBody("invalid_url", "Send JSON like { \"url\": \"https://your-app.com\" }."), { status: 400 });
  }
  if (typeof url !== "string" || !url.trim()) {
    return Response.json(kitErrorBody("invalid_url", "Paste the URL of a live page."), { status: 400 });
  }

  try {
    return Response.json(await previewOg(url));
  } catch (error) {
    if (error instanceof IngestError) return Response.json(errorBody(error), { status: 422 });
    captureException(error, { stage: "api.tools.og-preview", url });
    return Response.json(kitErrorBody("unknown", "Something went wrong reading that page."), { status: 500 });
  }
}
