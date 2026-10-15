import { IngestError } from "@/lib/ingest";
import { cookies } from "next/headers";
import { ANON_KITS_COOKIE, getSession, readAnonKits, secureCookies } from "@/lib/auth";
import { createKit, newId } from "@/lib/kits";
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

  // Opt-in progress stream: newline-delimited JSON events, ending with {type:"done"} or {type:"error"}.
  // The id is fixed up front so it can go in the cookie before the stream starts.
  const id = newId();
  const session = await getSession();
  const opts = { id, ownerEmail: session?.email };
  if (!session) {
    // Remember anonymous kits so they can be claimed on login.
    const jar = await cookies();
    const ids = [...readAnonKits(jar.get(ANON_KITS_COOKIE)?.value), id].slice(-50);
    jar.set(ANON_KITS_COOKIE, ids.join(","), { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }

  if (req.headers.get("accept")?.includes("application/x-ndjson")) return streamKit(url, opts);

  try {
    const kit = await createKit(url, undefined, opts);
    return Response.json({ id: kit.id, url: `/kit/${kit.id}` }, { status: 201 });
  } catch (error) {
    if (error instanceof IngestError) return Response.json({ error: error.userMessage }, { status: 422 });
    captureException(error, { stage: "api.kits.create", url });
    return Response.json({ error: "Something went wrong reading your app. Please try again." }, { status: 500 });
  }
}

function streamKit(url: string, opts: { id: string; ownerEmail?: string }): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Client went away; keep generating so the kit still gets saved.
        }
      };
      try {
        const kit = await createKit(url, (step) => send({ type: "step", step }), opts);
        send({ type: "done", id: kit.id, url: `/kit/${kit.id}` });
      } catch (error) {
        if (error instanceof IngestError) send({ type: "error", status: 422, error: error.userMessage });
        else {
          captureException(error, { stage: "api.kits.create", url });
          send({ type: "error", status: 500, error: "Something went wrong reading your app. Please try again." });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
  });
}
