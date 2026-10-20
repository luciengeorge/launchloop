import { after } from "next/server";
import { captureServerEvent, eventUuid, resolveDistinctId } from "@/lib/analytics-server";
import { attributionProperties, parseAttribution } from "@/lib/attribution";
import { type KitErrorBody, kitErrorBody } from "@/lib/errors";
import { speculateDraft } from "@/lib/generation";
import { IngestError } from "@/lib/ingest";
import { LlmError } from "@/lib/llm";
import type { Kit } from "@/lib/schema";
import { cookies } from "next/headers";
import { ANON_KITS_COOKIE, getSession, readAnonKits, secureCookies } from "@/lib/auth";
import { type KitRequestTrace, type PreviewSource, phase, previewSourceOf, safeInput, traceKitRequest } from "@/lib/kit-tracing";
import { type KitOptions, type KitStep, createKit, latestUnpaidKitId, markKitFailed, markKitPending, newId } from "@/lib/kits";
import { captureException } from "@/lib/observability";
import { type PreviewSlot, freePreviewGate } from "@/lib/rate-limit";

export const maxDuration = 300;

export async function POST(req: Request) {
  return traceKitRequest({ maxDurationSeconds: maxDuration }, async (trace) => {
    const startedAt = Date.now();
    let url: unknown;
    let attribution: unknown;
    let analyticsId: unknown;
    try {
      ({ url, attribution, analyticsId } = (await req.json()) as { url?: unknown; attribution?: unknown; analyticsId?: unknown });
    } catch {
      trace.end({ status: "error", code: "invalid_url" });
      return Response.json(kitErrorBody("invalid_url", "Send JSON like { \"url\": \"https://github.com/you/app\" }."), { status: 400 });
    }
    if (typeof url !== "string" || !url.trim()) {
      trace.end({ status: "error", code: "invalid_url" });
      return Response.json(kitErrorBody("invalid_url", "Paste a GitHub repo URL or your live site URL."), { status: 400 });
    }
    const input = url;
    // Kill switch, input check, per-IP limit and global daily cap.
    const gate = await phase("kits.rate_limit", "rate_limit", {}, () => freePreviewGate(req, input));
    if (gate.refused) {
      const { refused } = gate;
      const body = (await refused.clone().json().catch(() => ({}))) as Partial<KitErrorBody>;
      trace.end({ status: "error", code: body.code ?? `http_${refused.status}` });
      return body.code === "rate_limited" ? withLatestKit(refused, body as KitErrorBody) : refused;
    }
    const usage = previewUsage(gate.slot);

    // Opt-in progress stream: newline-delimited JSON events, starting with {type:"accepted"} and ending
    // with {type:"done"} or {type:"error"}. The id is fixed up front so it can go in the cookie before the stream starts.
    const id = newId();
    const session = await getSession();
    const opts = { id, ownerEmail: session?.email, attribution: parseAttribution(attribution) } satisfies KitOptions;
    const stream = !!req.headers.get("accept")?.includes("application/x-ndjson");
    trace.set({ "kit.source": previewSourceOf(url), "kit.input": safeInput(url), "kit.id": id, "kit.logged_in": !!session, "kit.stream": stream });
    if (!session) {
      // Remember anonymous kits so they can be claimed on login.
      const jar = await cookies();
      const ids = [...readAnonKits(jar.get(ANON_KITS_COOKIE)?.value), id].slice(-50);
      jar.set(ANON_KITS_COOKIE, ids.join(","), { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }

    const created: OnCreated = (kit, details) =>
      trackCreated(kit, { distinctId: resolveDistinctId(analyticsId), source: previewSourceOf(input), isLoggedIn: !!session, stream, startedAt, ...details });
    if (stream) return streamKit(url, opts, trace, usage, created);

    try {
      const kit = await createKit(url, usage.onStep, opts);
      await usage.succeeded(kit);
      speculate(kit);
      created(kit, {});
      trace.end({ status: "ok" });
      return Response.json({ id: kit.id, url: `/kit/${kit.id}` }, { status: 201 });
    } catch (error) {
      await usage.failed();
      const { status, body } = toErrorResponse(error, url);
      trace.end({ status: "error", code: body.code });
      return Response.json(body, { status });
    }
  });
}

/**
 * A preview counts once its first model call (the brief) has completed: createKit reports "copy" right after.
 * A run that fails before then (private or missing repo, unreachable site, AI down) gives its slot back, and so
 * does a cache hit (same repo at the same commit within 24 hours, `reusedFrom`), which reports "copy" without
 * any model call. Both within the refund allowance.
 * A client that disconnects doesn't stop the run, so an abandoned preview that finishes still counts.
 */
function previewUsage(slot: PreviewSlot) {
  let modelCallDone = false;
  return {
    onStep(step: KitStep) {
      if (step === "copy") modelCallDone = true;
    },
    async succeeded(kit: Kit) {
      if (kit.reusedFrom) await slot.refund();
    },
    async failed() {
      if (!modelCallDone) await slot.refund();
    },
  };
}

/** The 429 with the visitor's newest unpaid preview attached, so the form can offer to unlock it. Never throws. */
async function withLatestKit(refused: Response, body: KitErrorBody): Promise<Response> {
  try {
    const [session, jar] = await Promise.all([getSession(), cookies()]);
    const kitId = await latestUnpaidKitId(readAnonKits(jar.get(ANON_KITS_COOKIE)?.value), session?.email);
    return kitId ? Response.json({ ...body, kitId }, { status: refused.status, headers: refused.headers }) : refused;
  } catch (error) {
    captureException(error, { stage: "api.kits.latestKit" });
    return refused;
  }
}

type OnCreated = (kit: Kit, details: { clientDisconnected?: boolean }) => void;

/**
 * kit_created, on the browser's id when it sent one. preview_completed comes from the browser, so it's lost when
 * the tab closes or the stream drops mid-generation; the server saves the kit anyway, and this records it.
 * The uuid comes from the kit id, so a kit counts once.
 */
function trackCreated(
  kit: Kit,
  ctx: { distinctId: string; source: PreviewSource; isLoggedIn: boolean; stream: boolean; startedAt: number; clientDisconnected?: boolean },
) {
  const durationMs = Date.now() - ctx.startedAt;
  after(() =>
    captureServerEvent("kit_created", {
      distinctId: ctx.distinctId,
      uuid: eventUuid(`kit_created:${kit.id}`),
      properties: {
        kitId: kit.id,
        source: ctx.source,
        isLoggedIn: ctx.isLoggedIn,
        stream: ctx.stream,
        reused: !!kit.reusedFrom,
        durationMs,
        ...(ctx.clientDisconnected ? { client_disconnected: true } : {}),
        ...attributionProperties(kit.attribution),
      },
    }),
  );
}

function streamKit(url: string, opts: KitOptions & { id: string }, trace: KitRequestTrace, usage: ReturnType<typeof previewUsage>, created: OnCreated): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let disconnected = false;
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Client went away; keep generating so the kit still gets saved.
          if (!disconnected) trace.set({ "kit.client_disconnected": true });
          disconnected = true;
        }
      };
      try {
        // Marked before "accepted" so a client that loses the stream and opens /kit/[id] finds it.
        await phase("db.kit.mark_pending", "db", {}, () => markKitPending(opts.id)).catch((error) =>
          captureException(error, { stage: "api.kits.markPending", kitId: opts.id }),
        );
        send({ type: "accepted", id: opts.id });
        const kit = await createKit(
          url,
          (step) => {
            usage.onStep(step);
            send({ type: "step", step });
          },
          opts,
        );
        await usage.succeeded(kit);
        speculate(kit);
        created(kit, { clientDisconnected: disconnected });
        send({ type: "done", id: kit.id, url: `/kit/${kit.id}` });
        trace.end({ status: "ok" });
      } catch (error) {
        await usage.failed();
        const { status, body } = toErrorResponse(error, url);
        await markKitFailed(opts.id, body).catch(() => undefined);
        send({ type: "error", status, ...body });
        trace.end({ status: "error", code: body.code });
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
  // llm.ts already reported it (throttled), so an AI Gateway outage isn't one Sentry event per visitor.
  if (error instanceof LlmError) return { status: 503, body: kitErrorBody("ai_busy") };
  captureException(error, { stage: "api.kits.create", input: safeInput(url), code: "unknown" });
  return { status: 500, body: kitErrorBody("unknown") };
}
