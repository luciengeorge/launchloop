"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { PAYWALL_EARLY_CTA_FLAG, type PaywallEarlyCta } from "@/lib/paywall-cta";
import { runCheckout, trackUnlockClicked, trackUnlockShown, type CheckoutFailure, type CheckoutOutcome, type UnlockContext, type UnlockCtaPosition } from "@/lib/unlock-checkout";

interface CheckoutState {
  /** A checkout is starting or the page is on its way to Stripe: every unlock button waits. */
  redirecting: boolean;
  /** The last checkout that failed, and which button it was for: only that one shows the error. */
  failed: { position: UnlockCtaPosition; failure: CheckoutFailure } | null;
  /** Full-price Checkout URL, set when the promo arm's LAUNCH14 was turned down by Stripe. */
  fullPriceUrl: string | null;
}

export interface UnlockCheckout extends CheckoutState {
  /** exp_paywall_early_cta was on for this paywall. */
  earlyCta: boolean;
  /** Runs the kit's checkout for one button and sends the buyer on to Stripe when it starts. */
  start: (context: UnlockContext, options: { promo: boolean; retry: boolean }) => Promise<CheckoutOutcome["kind"]>;
  /** A click on an unlock button (or its error's "Try again"): logged, then checkout, or the full-price session if there is one. */
  click: (context: UnlockContext, options: { promo: boolean; retry: boolean }) => void;
}

function useCheckoutState(earlyCta: boolean, autoCheckout: boolean): UnlockCheckout {
  const [state, setState] = useState<CheckoutState>({ redirecting: autoCheckout, failed: null, fullPriceUrl: null });

  const start = useCallback<UnlockCheckout["start"]>(async (context, options) => {
    setState((s) => ({ ...s, redirecting: true, failed: null }));
    const outcome = await runCheckout(context, options);
    switch (outcome.kind) {
      case "redirect":
        window.location.assign(outcome.url);
        break;
      case "full_price":
        setState((s) => ({ ...s, redirecting: false, fullPriceUrl: outcome.url }));
        break;
      case "failed":
        setState((s) => ({ ...s, redirecting: false, failed: { position: context.position, failure: outcome.failure } }));
        break;
      default: {
        const unhandled: never = outcome;
        throw new Error(`Unhandled checkout outcome: ${JSON.stringify(unhandled)}`);
      }
    }
    return outcome.kind;
  }, []);

  const { fullPriceUrl } = state;
  const click = useCallback<UnlockCheckout["click"]>(
    (context, options) => {
      trackUnlockClicked(context, options.retry);
      if (fullPriceUrl) window.location.assign(fullPriceUrl);
      else void start(context, options);
    },
    [fullPriceUrl, start],
  );

  return { ...state, earlyCta, start, click };
}

const UnlockCheckoutContext = createContext<UnlockCheckout | null>(null);

interface ProviderProps {
  earlyCta: PaywallEarlyCta;
  /** Arrived with ?unlock=1: the panel starts checkout at once, so every button starts out waiting. */
  autoCheckout: boolean;
  children: ReactNode;
}

/**
 * One checkout for the whole paywall, so the early CTA, the sticky bar and the panel can't start two at once, all show
 * when it's under way, and agree on a full-price fallback. Adds no markup. Logs flag_fallback once per view when the
 * early CTA is off only because PostHog didn't answer.
 */
export function UnlockCheckoutProvider({ earlyCta, autoCheckout, children }: ProviderProps) {
  const value = useCheckoutState(earlyCta.enabled, autoCheckout);
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current || !earlyCta.fallback) return;
    reported.current = true;
    track("flag_fallback", { flag: PAYWALL_EARLY_CTA_FLAG, variant: "control", reason: earlyCta.fallback, fallback: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount, with what the server rendered
  }, []);
  return <UnlockCheckoutContext value={value}>{children}</UnlockCheckoutContext>;
}

/** The paywall's shared checkout, or one of its own for a panel rendered without the provider (no early CTA). */
export function useUnlockCheckout(): UnlockCheckout {
  const shared = useContext(UnlockCheckoutContext);
  const own = useCheckoutState(false, false);
  return shared ?? own;
}

/**
 * A ref for an unlock button that logs unlock_cta_shown the first time it's at least half in view, once per mount.
 * Off-screen, `display: none` (the sticky bar from lg) or slid out of view, it isn't in view.
 */
export function useShownOnce(context: UnlockContext) {
  const seen = useRef(false);
  const latest = useRef(context);
  useEffect(() => {
    latest.current = context;
  });
  return useCallback((element: HTMLElement | null) => {
    if (!element || seen.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return;
        seen.current = true;
        observer.disconnect();
        trackUnlockShown(latest.current);
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
}
