"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

/**
 * How many inline signups are mounted and visible. Next keeps pages visited client-side mounted but hidden, and hiding
 * runs effect cleanups, so this drops to 0 when the visitor leaves the page; CSS :has() would still see the hidden block.
 */
let claims = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** A layout effect, so the footer has swapped before the page paints. */
export function useClaimInlineNewsletter() {
  useLayoutEffect(() => {
    claims += 1;
    emit();
    return () => {
      claims -= 1;
      emit();
    };
  }, []);
}

/** Undefined during server render and hydration, where CSS decides from the HTML; then whether an inline signup is showing. */
export function useInlineNewsletterShown(): boolean | undefined {
  return useSyncExternalStore(
    subscribe,
    () => claims > 0,
    () => undefined,
  );
}

/** Nothing to render: marks the inline signup it sits in as showing, for the footer. */
export function InlineNewsletterClaim() {
  useClaimInlineNewsletter();
  return null;
}
