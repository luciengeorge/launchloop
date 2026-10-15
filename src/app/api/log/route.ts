import { captureException } from "@/lib/observability";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Receives client-side errors from error boundaries and window listeners. */
export async function POST(req: Request) {
  if (!rateLimit(`log:${clientIp(req)}`, 30, 60_000).ok) return new Response(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { message?: string; stack?: string; digest?: string; url?: string } | null;
  if (body?.message) {
    const error = new Error(String(body.message).slice(0, 500));
    error.stack = body.stack?.slice(0, 4000);
    captureException(error, { stage: "client", digest: body.digest, url: body.url });
  }
  return new Response(null, { status: 204 });
}
