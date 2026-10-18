import { analyticsId, firstTouch } from "./analytics";
import type { ExperimentKey, Served } from "./experiments";

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export interface CheckoutStart {
  url: string;
  /** "unavailable": the page showed LAUNCH14 but Stripe wouldn't take it, so `url` is a full-price session. */
  promo?: "applied" | "unavailable" | "none";
}

/**
 * Creates a Checkout session (the server records checkout_started) and returns where to send the buyer.
 * `served` is what this page showed for other experiments, logged as is. The kit promo
 * (exp_launch14_promo) is never sent: the server resolves it and decides LAUNCH14.
 * Kit only: Ship Loop is a free waitlist, and /api/checkout rejects anything else.
 */
export async function startCheckout(product: "kit", kitId: string, served: Partial<Record<ExperimentKey, Served>> = {}): Promise<CheckoutStart> {
  const entries = Object.entries(served) as [ExperimentKey, Served][];
  return postJson<CheckoutStart>("/api/checkout", {
    product,
    kitId,
    analyticsId: await analyticsId(),
    experiments: Object.fromEntries(entries.map(([key, s]) => [key, s.variant])),
    fallbacks: entries.filter(([, s]) => s.fallback).map(([key]) => key),
  });
}


export function reportClientError(error: Error & { digest?: string }) {
  try {
    const payload = JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest, url: window.location.href });
    if (!navigator.sendBeacon?.("/api/log", new Blob([payload], { type: "application/json" }))) {
      void fetch("/api/log", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // Reporting must never throw inside an error handler.
  }
}

export type KitStreamEvent =
  | { type: "accepted"; id: string }
  | { type: "step"; step: string }
  | { type: "done"; id: string; url: string }
  | { type: "error"; status: number; error: string; code?: string; fix?: string };

/** Where a connection failure happened and what the browser looked like at the time, for preview_failed. */
export interface KitFailureDetails {
  phase?: "request" | "stream";
  errorName?: string;
  errorMessage?: string;
  online?: boolean;
  visibility?: DocumentVisibilityState;
  /** Set once the server accepted the preview: it keeps generating, so /kit/[id] can pick it up. */
  kitId?: string;
}

/** An error the kit form can show with a title and a suggested fix. */
export class KitRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string = "unknown",
    public readonly fix?: string,
    public readonly details: KitFailureDetails = {},
  ) {
    super(message);
    this.name = "KitRequestError";
  }
}

/**
 * A lost connection is "aborted" when the page was hidden or unloading (tab switch, navigation,
 * a bot closing the page), otherwise "network".
 */
function connectionError(phase: "request" | "stream", error: unknown, unloading: boolean, kitId?: string): KitRequestError {
  const details: KitFailureDetails = {
    phase,
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 200),
    online: navigator.onLine,
    visibility: document.visibilityState,
    kitId,
  };
  if (unloading || document.visibilityState === "hidden") {
    return new KitRequestError("Your preview was interrupted.", "aborted", "Try again and keep this tab open. It usually takes under 30 seconds.", details);
  }
  return phase === "request"
    ? new KitRequestError("We couldn't reach LaunchLoop.", "network", "Check your connection and try again.", details)
    : new KitRequestError("The connection dropped before your preview was ready.", "network", "Try again. It usually takes under 30 seconds.", details);
}

/** POST /api/kits with live progress. Falls back to the plain JSON response if streaming isn't available. */
export async function createKitWithProgress(input: string, onStep: (step: string) => void): Promise<{ url: string }> {
  let unloading = false;
  const onPageHide = () => {
    unloading = true;
  };
  window.addEventListener("pagehide", onPageHide);
  try {
    return await readKitStream(input, onStep, () => unloading);
  } finally {
    window.removeEventListener("pagehide", onPageHide);
  }
}

async function readKitStream(input: string, onStep: (step: string) => void, isUnloading: () => boolean): Promise<{ url: string }> {
  let res: Response;
  try {
    res = await fetch("/api/kits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson, application/json" },
      body: JSON.stringify({ url: input, attribution: firstTouch() }),
    });
  } catch (error) {
    throw connectionError("request", error, isUnloading());
  }
  if (!res.headers.get("content-type")?.includes("application/x-ndjson") || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string; fix?: string };
    if (!res.ok || !data.url) throw new KitRequestError(data.error ?? "Something went wrong reading your app.", data.code, data.fix ?? "Try again in a moment.");
    return { url: data.url };
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let acceptedId: string | undefined;
  for (;;) {
    let chunk: ReadableStreamReadResult<string>;
    try {
      chunk = await reader.read();
    } catch (error) {
      throw connectionError("stream", error, isUnloading(), acceptedId);
    }
    const { value, done } = chunk;
    if (value) buffer += value;
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      if (!line.trim()) continue;
      let event: KitStreamEvent;
      try {
        event = JSON.parse(line) as KitStreamEvent;
      } catch {
        continue;
      }
      if (event.type === "accepted") acceptedId = event.id;
      else if (event.type === "step") onStep(event.step);
      else if (event.type === "done") return { url: event.url };
      else if (event.type === "error") throw new KitRequestError(event.error, event.code, event.fix);
    }
    if (done) {
      const ended = new Error("Stream ended without a done or error line");
      ended.name = "StreamEnded";
      throw connectionError("stream", ended, isUnloading(), acceptedId);
    }
  }
}
