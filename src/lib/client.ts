import { analyticsId } from "./analytics";
import type { ExperimentKey, Experiments, Served } from "./experiments";

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
 * `served` is what this page showed for each experiment; the server logs exactly that and applies
 * LAUNCH14 only when the page showed the promo treatment as a real assignment.
 * Kit only: the Ship Loop pre-order goes through startPreorderCheckout.
 */
export async function startCheckout(product: "kit", kitId: string, served: Partial<Record<ExperimentKey, Served>> = {}): Promise<CheckoutStart> {
  const entries = Object.entries(served) as [ExperimentKey, Served][];
  return postJson<CheckoutStart>("/api/checkout", {
    product,
    kitId,
    analyticsId: analyticsId(),
    experiments: Object.fromEntries(entries.map(([key, s]) => [key, s.variant])),
    fallbacks: entries.filter(([, s]) => s.fallback).map(([key]) => key),
  });
}

/** The one-time £99 Ship Loop founding pre-order. Pages only offer it when STRIPE_PRICE_SHIPLOOP_PREORDER is set (or in mock mode). */
export async function startPreorderCheckout(experiments: Experiments = {}): Promise<CheckoutStart> {
  return postJson<CheckoutStart>("/api/checkout", { product: "shiploop_preorder", analyticsId: analyticsId(), experiments });
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
  | { type: "step"; step: string }
  | { type: "done"; id: string; url: string }
  | { type: "error"; status: number; error: string; code?: string; fix?: string };

/** An error the kit form can show with a title and a suggested fix. */
export class KitRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string = "unknown",
    public readonly fix?: string,
  ) {
    super(message);
    this.name = "KitRequestError";
  }
}

/** POST /api/kits with live progress. Falls back to the plain JSON response if streaming isn't available. */
export async function createKitWithProgress(input: string, onStep: (step: string) => void): Promise<{ url: string }> {
  let res: Response;
  try {
    res = await fetch("/api/kits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson, application/json" },
      body: JSON.stringify({ url: input }),
    });
  } catch {
    throw new KitRequestError("We couldn't reach LaunchLoop.", "network", "Check your connection and try again.");
  }
  if (!res.headers.get("content-type")?.includes("application/x-ndjson") || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string; fix?: string };
    if (!res.ok || !data.url) throw new KitRequestError(data.error ?? "Something went wrong reading your app.", data.code, data.fix ?? "Try again in a moment.");
    return { url: data.url };
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
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
      if (event.type === "step") onStep(event.step);
      else if (event.type === "done") return { url: event.url };
      else if (event.type === "error") throw new KitRequestError(event.error, event.code, event.fix);
    }
    if (done) throw new KitRequestError("The connection dropped before your preview was ready.", "network", "Try again. It usually takes under 30 seconds.");
  }
}
