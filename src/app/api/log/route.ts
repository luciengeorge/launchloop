import { captureException } from "@/lib/observability";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const HYDRATION_ERROR = /Minified React error #4(18|19|20|21|22|23|25)/;

/** Receives client-side errors from error boundaries and window listeners. */
export async function POST(req: Request) {
  if (!rateLimit(`log:${clientIp(req)}`, 30, 60_000).ok) return new Response(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { message?: string; stack?: string; digest?: string; url?: string } | null;
  if (body?.message) {
    const message = String(body.message).slice(0, 500);
    const error = new Error(message);
    error.stack = body.stack?.slice(0, 4000);
    // Browser and locale only, to tell translator-extension DOM edits apart from real mismatches. No IP or other PII.
    const ua = req.headers.get("user-agent")?.slice(0, 200);
    const lang = req.headers.get("accept-language")?.slice(0, 50);
    const country = req.headers.get("x-vercel-ip-country") ?? undefined;
    const hydration = HYDRATION_ERROR.test(message) || message.includes("Hydration");
    captureException(error, { stage: "client", digest: body.digest, url: body.url, ua, lang, country }, hydration ? { hydration: true } : undefined);
  }
  return new Response(null, { status: 204 });
}
