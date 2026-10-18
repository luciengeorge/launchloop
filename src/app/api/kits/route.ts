import { after } from "next/server";
import { kitErrorBody } from "@/lib/errors";
import { speculateDraft } from "@/lib/generation";
import { IngestError } from "@/lib/ingest";
import { LlmError } from "@/lib/llm";
import type { Kit } from "@/lib/schema";
import { cookies } from "next/headers";
import { ANON_KITS_COOKIE, getSession, readAnonKits, secureCookies } from "@/lib/auth";
import { createKit, newId } from "@/lib/kits";
import { captureException } from "@/lib/observability";
import { freePreviewGate } from "@/lib/rate-limit";

export const maxDuration = 300;

export async function POST(req: Request) {
  const refused = await freePreviewGate(req);
  if (refused) return refused;

  let url: unknown;
  try {
    ({ url } = (await req.json()) as { url?: unknown });
  } catch {
    return Response.json(kitErrorBody("invalid_url", "Send JSON like { \"url\": \"https://github.com/you/app\" }."), { status: 400 });
  }
  if (typeof url !== "string" || !url.trim()) {
    return Response.json(kitErrorBody("invalid_url", "Paste a GitHub repo URL or your live site URL."), { status: 400 });
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
    speculate(kit);
    return Response.json({ id: kit.id, url: `/kit/${kit.id}` }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error, url);
    return Response.json(body, { status });
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
        speculate(kit);
        send({ type: "done", id: kit.id, url: `/kit/${kit.id}` });
      } catch (error) {
        const { status, body } = toErrorResponse(error, url);
        send({ type: "error", status, ...body });
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

/** Starts writing the full kit in the background (within the daily budget) so it's ready the moment the buyer pays. */
function speculate(kit: Kit) {
  after(() => speculateDraft(kit).catch((error) => captureException(error, { stage: "kits.speculativeDraft", kitId: kit.id })));
}

function toErrorResponse(error: unknown, url: string) {
  if (error instanceof IngestError) return { status: 422, body: kitErrorBody(error.code, error.userMessage) };
  if (error instanceof LlmError) {
    captureException(error, { stage: "api.kits.create.llm", url });
    return { status: 503, body: kitErrorBody("llm_failed") };
  }
  captureException(error, { stage: "api.kits.create", url });
  return { status: 500, body: kitErrorBody("unknown") };
}
