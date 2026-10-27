import { track } from "./analytics";
import { CHECKOUT_UNAVAILABLE_MESSAGE } from "./checkout-session";
import { ApiError, startCheckout } from "./client";
import { REQUEST_TIMEOUT_MS, RequestTimeoutError, withTimeout } from "./request-guards";

/** Where an unlock button sits on the kit paywall: under its heading, the sticky bar below lg, or the panel beside it. */
export type UnlockCtaPosition = "top" | "sticky" | "panel";

/** `mobile` below Tailwind's lg breakpoint, where the paywall is one column and the sticky bar can show. */
export type PaywallViewport = "mobile" | "desktop";
export const DESKTOP_QUERY = "(min-width: 64rem)";
export const paywallViewport = (): PaywallViewport => (window.matchMedia(DESKTOP_QUERY).matches ? "desktop" : "mobile");

/** What every unlock event carries. `earlyCta`: the page showed the early CTA (exp_paywall_early_cta on). */
export interface UnlockContext {
  kitId: string;
  position: UnlockCtaPosition;
  earlyCta: boolean;
  isLoggedIn: boolean;
}

/** Once per position per page view, when the button is at least half in view. */
export function trackUnlockShown(context: UnlockContext) {
  track("unlock_cta_shown", { ...context, viewport: paywallViewport() });
}

/** `retry`: the error's "Try again" rather than the button itself. */
export function trackUnlockClicked(context: UnlockContext, retry: boolean) {
  track("unlock_cta_clicked", { ...context, viewport: paywallViewport(), retry });
}

/** `checkout_unavailable`: any 503, /api/checkout's own (production without Stripe) or a gateway's in front of it. */
export type CheckoutFailureCode = "network" | "rate_limited" | "kit_missing" | "checkout_unavailable" | "server" | "unknown";

/** A checkout that didn't start, as the visitor sees it. `message` is ours or the API's, never a raw browser error. */
export interface CheckoutFailure {
  code: CheckoutFailureCode;
  message: string;
}

/** Past this, a checkout that hasn't started is abandoned and shown as a network failure, with Try again. */
export const CHECKOUT_TIMEOUT_MS = REQUEST_TIMEOUT_MS;

const NETWORK_MESSAGE = "We couldn't reach checkout. Check your connection and try again.";
const SERVER_MESSAGE = "Couldn't start checkout. Please try again.";
const RATE_LIMITED_MESSAGE = "Too many checkout attempts. Try again in a few minutes.";
const KIT_MISSING_MESSAGE = "That kit doesn't exist any more. Generate a new preview.";

/**
 * Only the API's own words (`serverMessage`) or ours are ever shown: never a raw browser error or "Request failed
 * (500)" from a body that wasn't our JSON. Any 503 is checkout being unavailable, ours (`checkout_unavailable`) or a
 * gateway's in front of it, so it always offers the email-us link.
 */
export function checkoutFailure(error: unknown): CheckoutFailure {
  if (error instanceof RequestTimeoutError) return { code: "network", message: NETWORK_MESSAGE };
  if (!(error instanceof ApiError)) return error instanceof TypeError ? { code: "network", message: NETWORK_MESSAGE } : { code: "unknown", message: SERVER_MESSAGE };
  const said = error.serverMessage;
  if (error.status === 503 || error.code === "checkout_unavailable") return { code: "checkout_unavailable", message: said ?? CHECKOUT_UNAVAILABLE_MESSAGE };
  if (error.status === 429 || error.code === "rate_limited") return { code: "rate_limited", message: said ?? RATE_LIMITED_MESSAGE };
  if (error.status === 404) return { code: "kit_missing", message: said ?? KIT_MISSING_MESSAGE };
  if (error.status >= 500) return { code: "server", message: said ?? SERVER_MESSAGE };
  return { code: "unknown", message: said ?? SERVER_MESSAGE };
}

/**
 * What a checkout error offers, never nothing: "retry" runs the same checkout again, "save" emails a link that keeps
 * the preview (signed out only, the paywall's save-preview form), "new_preview" starts over when the kit is gone,
 * "email_us" writes to us for a payment link while checkout is offline (what /api/checkout's message suggests).
 */
export type CheckoutRecovery = "retry" | "save" | "new_preview" | "email_us";

export function checkoutRecovery(code: CheckoutFailureCode, isLoggedIn: boolean): [CheckoutRecovery, ...CheckoutRecovery[]] {
  switch (code) {
    case "checkout_unavailable":
      return isLoggedIn ? ["retry", "email_us"] : ["retry", "email_us", "save"];
    case "network":
    case "rate_limited":
    case "server":
    case "unknown":
      return isLoggedIn ? ["retry"] : ["retry", "save"];
    case "kit_missing":
      return ["new_preview"];
    default: {
      const unhandled: never = code;
      throw new Error(`Unhandled checkout failure: ${String(unhandled)}`);
    }
  }
}

export type CheckoutOutcome =
  | { kind: "redirect"; url: string }
  /** The page showed LAUNCH14 but the session is full price: show the note, and the next click goes to `url`. */
  | { kind: "full_price"; url: string }
  | { kind: "failed"; failure: CheckoutFailure }
  /** The caller went away (unmounted) first: nothing to show or log. */
  | { kind: "cancelled" };

/**
 * Starts the kit's Checkout the one way every unlock button does, and logs a failure (checkout_failed). `promo`: the
 * page is showing the LAUNCH14 price. Doesn't navigate: the caller sends the buyer to `url`. After CHECKOUT_TIMEOUT_MS
 * the request is aborted and it's a network failure; `signal` (the caller unmounting) cancels it without one.
 */
export async function runCheckout(
  context: UnlockContext,
  { promo, retry }: { promo: boolean; retry: boolean },
  { signal }: { signal?: AbortSignal } = {},
): Promise<CheckoutOutcome> {
  try {
    // Timed over the whole start, not just the fetch: startCheckout first waits for the analytics id (the PostHog SDK).
    const { url, promo: outcome } = await withTimeout((timeout) => startCheckout("kit", context.kitId, {}, { signal: timeout }), { timeoutMs: CHECKOUT_TIMEOUT_MS, signal });
    if (!url) throw new ApiError(SERVER_MESSAGE, 502);
    if (outcome === "unavailable" || (promo && outcome !== "applied")) return { kind: "full_price", url };
    return { kind: "redirect", url };
  } catch (error) {
    if (signal?.aborted) return { kind: "cancelled" };
    const failure = checkoutFailure(error);
    track("checkout_failed", { ...context, viewport: paywallViewport(), code: failure.code, retry });
    return { kind: "failed", failure };
  }
}
