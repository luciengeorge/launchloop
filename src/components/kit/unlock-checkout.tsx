"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { PAYWALL_EARLY_CTA_FLAG, SITE_HEADER_PX, type PaywallEarlyCta } from "@/lib/paywall-cta";
import { runCheckout, singleFlight, trackUnlockClicked, trackUnlockShown, type CheckoutFailure, type CheckoutOutcome, type UnlockContext, type UnlockCtaPosition } from "@/lib/unlock-checkout";

interface CheckoutState {
  /** A checkout is starting or the page is on its way to Stripe: every unlock button waits. */
  redirecting: boolean;
  /** Which button started the checkout under way (null for ?unlock=1's, started before any click). */
  pending: UnlockCtaPosition | null;
  /**
   * The last checkout that failed, and which button it was for: only that one shows the error. `attempt` is new for
   * every failure, so the same error twice (Try again failing again) still hands focus back (useFocusAfterFailure).
   */
  failed: { position: UnlockCtaPosition; failure: CheckoutFailure; attempt: number } | null;
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
  const [state, setState] = useState<CheckoutState>({ redirecting: autoCheckout, pending: null, failed: null, fullPriceUrl: null });
  const attempts = useRef(0);
  // Aborted on unmount: a checkout still waiting then stops, with its timeout timer, and logs nothing.
  const mounted = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    mounted.current = controller;
    return () => controller.abort();
  }, []);

  const run = useCallback<UnlockCheckout["start"]>(async (context, options) => {
    setState((s) => ({ ...s, redirecting: true, pending: context.position, failed: null }));
    const outcome = await runCheckout(context, options, { signal: mounted.current?.signal });
    switch (outcome.kind) {
      case "redirect":
        window.location.assign(outcome.url);
        break;
      case "full_price":
        setState((s) => ({ ...s, redirecting: false, pending: null, fullPriceUrl: outcome.url }));
        break;
      case "failed": {
        const attempt = ++attempts.current;
        setState((s) => ({ ...s, redirecting: false, pending: null, failed: { position: context.position, failure: outcome.failure, attempt } }));
        break;
      }
      case "cancelled":
        // Unmounted mid-checkout: nothing to show, but never left busy should the paywall mount again.
        setState((s) => ({ ...s, redirecting: false, pending: null }));
        break;
      default: {
        const unhandled: never = outcome;
        throw new Error(`Unhandled checkout outcome: ${JSON.stringify(unhandled)}`);
      }
    }
    return outcome.kind;
  }, []);

  // One checkout at a time for the whole paywall: a second start in the same task (before React re-renders the
  // buttons as busy) shares the first one's outcome instead of sending another POST. Still held once the page is on
  // its way to Stripe; free again after a failure (Try again), a timeout or a cancel.
  const guard = useRef<ReturnType<typeof singleFlight<Parameters<UnlockCheckout["start"]>, CheckoutOutcome["kind"]>> | null>(null);
  const start = useCallback<UnlockCheckout["start"]>(
    (context, options) => {
      guard.current ??= singleFlight(run, { holdWhile: (kind) => kind === "redirect" });
      return guard.current(context, options);
    },
    [run],
  );

  // Back (or forward) to this page from the bfcache: the redirect it was waiting on is over, so it's idle again.
  usePageRestored(() => {
    guard.current?.reset();
    setState((s) => ({ ...s, redirecting: false, pending: null }));
  });

  const { fullPriceUrl } = state;
  const click = useCallback<UnlockCheckout["click"]>(
    (context, options) => {
      // A second click before the buttons re-render as busy: neither a second click event nor a second checkout.
      if (guard.current?.inFlight()) return;
      trackUnlockClicked(context, options.retry);
      if (fullPriceUrl) window.location.assign(fullPriceUrl);
      else void start(context, options);
    },
    [fullPriceUrl, start],
  );

  return { ...state, earlyCta, start, click };
}

/**
 * Calls `onRestore` when the page is shown again from the back/forward cache (pageshow with `persisted`). The page
 * comes back exactly as it left, so anything that was waiting on the navigation away ("Taking you to secure checkout…",
 * busy buttons) would otherwise wait forever.
 */
export function usePageRestored(onRestore: () => void) {
  const latest = useRef(onRestore);
  useEffect(() => {
    latest.current = onRestore;
  });
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) latest.current();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
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
 * A ref for an unlock button that takes focus back when its checkout fails (`attempt`, from `failed`), so a keyboard or
 * screen reader user lands on the button beside the error, and can press it again, instead of on the page body. The
 * button may only mount after the failure (the panel shows "Taking you to secure checkout…" in its place), so it's
 * focused on the first render that has it. Only when focus was lost (on the body): it never takes focus from
 * somewhere the visitor has since put it.
 */
export function useFocusAfterFailure<T extends HTMLElement>(attempt: number | undefined) {
  const element = useRef<T | null>(null);
  const handled = useRef<number | undefined>(undefined);
  useEffect(() => {
    // Not mounted yet (the panel's status line still stands in for it): wait for the render that has it.
    if (attempt === undefined || attempt === handled.current || !element.current?.isConnected) return;
    handled.current = attempt;
    const active = document.activeElement;
    if (!active || active === document.body) element.current.focus();
  });
  return element;
}

/** The ref every unlock button takes: unlock_cta_shown once it's seen (useShownOnce), and focus back after a failure. */
export function useUnlockButtonRef(context: UnlockContext, failedAttempt: number | undefined) {
  const shownRef = useShownOnce(context);
  const focusRef = useFocusAfterFailure<HTMLButtonElement>(failedAttempt);
  return useCallback(
    (element: HTMLButtonElement | null) => {
      focusRef.current = element;
      const stopObserving = shownRef(element);
      // A callback ref that returns a cleanup isn't called with null on unmount, so the cleanup forgets the element.
      return () => {
        focusRef.current = null;
        stopObserving?.();
      };
    },
    [focusRef, shownRef],
  );
}

/**
 * A ref for an unlock button that logs unlock_cta_shown the first time it's at least half in view, once per mount.
 * Off-screen, under the sticky site header, `display: none` (the sticky bar from lg) or slid out of view, it isn't in view.
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
      { threshold: 0.5, rootMargin: `-${SITE_HEADER_PX}px 0px 0px 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
}
