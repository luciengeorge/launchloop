import { track } from "./analytics";
import { ApiError, startCheckout } from "./client";

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

export type CheckoutFailureCode = "network" | "rate_limited" | "kit_missing" | "server" | "unknown";

/** A checkout that didn't start, as the visitor sees it. `message` is ours or the API's, never a raw browser error. */
export interface CheckoutFailure {
  code: CheckoutFailureCode;
  message: string;
}

const NETWORK_MESSAGE = "We couldn't reach checkout. Check your connection and try again.";
const SERVER_MESSAGE = "Couldn't start checkout. Please try again.";

export function checkoutFailure(error: unknown): CheckoutFailure {
  if (!(error instanceof ApiError)) return error instanceof TypeError ? { code: "network", message: NETWORK_MESSAGE } : { code: "unknown", message: SERVER_MESSAGE };
  if (error.status === 429 || error.code === "rate_limited") return { code: "rate_limited", message: error.message };
  if (error.status === 404) return { code: "kit_missing", message: error.message };
  if (error.status >= 500) return { code: "server", message: error.message || SERVER_MESSAGE };
  return { code: "unknown", message: error.message || SERVER_MESSAGE };
}

/**
 * What a checkout error offers, never nothing: "retry" runs the same checkout again, "save" emails a link that keeps
 * the preview (signed out only, the paywall's save-preview form), "new_preview" starts over when the kit is gone.
 */
export type CheckoutRecovery = "retry" | "save" | "new_preview";

export function checkoutRecovery(code: CheckoutFailureCode, isLoggedIn: boolean): [CheckoutRecovery, ...CheckoutRecovery[]] {
  switch (code) {
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
  | { kind: "failed"; failure: CheckoutFailure };

/**
 * Starts the kit's Checkout the one way every unlock button does, and logs a failure (checkout_failed). `promo`: the
 * page is showing the LAUNCH14 price. Doesn't navigate: the caller sends the buyer to `url`.
 */
export async function runCheckout(context: UnlockContext, { promo, retry }: { promo: boolean; retry: boolean }): Promise<CheckoutOutcome> {
  try {
    const { url, promo: outcome } = await startCheckout("kit", context.kitId);
    if (!url) throw new ApiError(SERVER_MESSAGE, 502);
    if (outcome === "unavailable" || (promo && outcome !== "applied")) return { kind: "full_price", url };
    return { kind: "redirect", url };
  } catch (error) {
    const failure = checkoutFailure(error);
    track("checkout_failed", { ...context, viewport: paywallViewport(), code: failure.code, retry });
    return { kind: "failed", failure };
  }
}
