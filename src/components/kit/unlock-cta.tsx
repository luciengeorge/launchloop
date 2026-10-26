"use client";

import { cn } from "cn";
import { Loader2, Lock } from "lucide-react";
import { useEffect, useId, useState, type Ref } from "react";
import { Button } from "@/components/ui/button";
import type { Served } from "@/lib/experiments";
import { SITE_HEADER_PX, UNLOCK_ZONE_ATTRIBUTE } from "@/lib/paywall-cta";
import { LAUNCH_PROMO } from "@/lib/products";
import type { UnlockContext, UnlockCtaPosition } from "@/lib/unlock-checkout";
import { useUnlockButtonRef, useUnlockCheckout } from "./unlock-checkout";
import { CheckoutError } from "./unlock-error";

interface Props {
  kitId: string;
  /** Full kit price; the panel's price, from the same resolved promo. */
  priceLabel: string;
  /** This kit's exp_launch14_promo, as resolveKitPromo served it to the panel (which records it). */
  launchPromo: Served;
  /** Logged-in email, if any. */
  email?: string;
}

function useUnlockButton({ kitId, priceLabel, launchPromo, email }: Props, position: UnlockCtaPosition) {
  const checkout = useUnlockCheckout();
  const promo = launchPromo.variant === "treatment" && !checkout.fullPriceUrl;
  const context: UnlockContext = { kitId, position, earlyCta: checkout.earlyCta, isLoggedIn: !!email };
  const failed = checkout.failed?.position === position ? checkout.failed : null;
  const errorId = useId();
  const buttonId = useId();
  return {
    checkout,
    context,
    failure: failed?.failure ?? null,
    failedAttempt: failed?.attempt,
    errorId,
    buttonId,
    price: promo ? LAUNCH_PROMO.priceLabel : priceLabel,
    struck: promo ? priceLabel : null,
    click: (retry: boolean) => {
      // "Try again" is about to disappear with its error: focus waits on the unlock button, which stays focusable while busy.
      if (retry) document.getElementById(buttonId)?.focus();
      checkout.click(context, { promo, retry });
    },
  };
}

interface UnlockButtonProps {
  id?: string;
  price?: string;
  busy: boolean;
  onClick?: () => void;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
  /** The id of this button's checkout error, while it has one. */
  describedBy?: string;
}

/** Busy, it's aria-disabled but keeps focus (focusableWhenDisabled), so focus doesn't drop to the page while checkout starts. */
function UnlockButton({ id, price, busy, onClick, className, ref, describedBy }: UnlockButtonProps) {
  return (
    <Button
      ref={ref}
      id={id}
      type="button"
      className={cn("h-11 text-base aria-disabled:pointer-events-none aria-disabled:opacity-50", className)}
      onClick={onClick}
      disabled={busy || !onClick}
      focusableWhenDisabled={!!onClick}
      aria-describedby={describedBy}
    >
      {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Lock aria-hidden="true" />}
      {price ? `Unlock the full kit, ${price}` : "Unlock the full kit"}
    </Button>
  );
}

function Price({ price, struck, className }: { price: string; struck: string | null; className?: string }) {
  return (
    <span className={className}>
      {struck ? (
        <s className="mr-1.5 text-base font-normal text-muted-foreground">
          <span className="sr-only">Was </span>
          {struck}
        </s>
      ) : null}
      {struck ? <span className="sr-only">now </span> : null}
      {price}
    </span>
  );
}

const ROW = "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";
/** Fixed from sm, so the placeholder's button (no price yet) is exactly as wide as the real one. */
const TOP_BUTTON = "w-full sm:w-64";

/** The early unlock CTA, right under the paywall heading on every viewport: the price and the same checkout as the panel's button. */
export function UnlockCta(props: Props) {
  const button = useUnlockButton(props, "top");
  const ref = useUnlockButtonRef(button.context, button.failedAttempt);
  return (
    <div className="rounded-xl border border-border bg-background p-4" data-testid="early-unlock-cta">
      <div className={ROW}>
        <p>
          <Price price={button.price} struck={button.struck} className="text-2xl font-semibold tracking-tight" />
          <span className="ml-1.5 text-sm text-muted-foreground">once, no subscription</span>
        </p>
        <UnlockButton
          ref={ref}
          id={button.buttonId}
          price={button.price}
          busy={button.checkout.redirecting}
          onClick={() => button.click(false)}
          className={TOP_BUTTON}
          describedBy={button.failure ? button.errorId : undefined}
        />
      </div>
      {button.failure ? <CheckoutError failure={button.failure} isLoggedIn={button.context.isLoggedIn} onRetry={() => button.click(true)} messageId={button.errorId} /> : null}
    </div>
  );
}

/** Stands in for UnlockCta until the kit's promo resolves: no price rather than one that might change, at the same size. */
export function UnlockCtaPlaceholder() {
  return (
    <div className="rounded-xl border border-border bg-background p-4" aria-busy="true" data-testid="early-unlock-cta-loading">
      <div className={ROW}>
        <p>
          <span className="text-2xl font-semibold tracking-tight">
            <span className="inline-block h-8 w-12 animate-pulse rounded-md bg-muted align-bottom" aria-label="Loading price" />
          </span>
          <span className="ml-1.5 text-sm text-muted-foreground">once, no subscription</span>
        </p>
        <UnlockButton busy={false} className={TOP_BUTTON} />
      </div>
    </div>
  );
}

/**
 * Visible once the visitor has scrolled past an unlock button while the paywall is still on screen and no unlock
 * button is (the locked sections and the free sample between the early CTA and the panel). It slides in and out over the page without moving anything, and is gone before the panel (with the
 * save-preview form) or anything after the paywall, like the footer, scrolls up behind it.
 */
function useStickyVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const paywall = document.querySelector('[data-testid="preview-paywall"]');
    if (!paywall) return;
    const zones = [...paywall.querySelectorAll(`[${UNLOCK_ZONE_ATTRIBUTE}]`)];
    // Read from layout on every scroll rather than from IntersectionObserver crossings: a jump (an anchor, a fling,
    // scroll restoration) can take a button from below the screen to above it without ever crossing into view.
    let frame = 0;
    const update = () => {
      frame = 0;
      const inView = (r: DOMRect) => r.bottom > SITE_HEADER_PX && r.top < window.innerHeight;
      const rects = zones.map((zone) => zone.getBoundingClientRect());
      setVisible(inView(paywall.getBoundingClientRect()) && !rects.some(inView) && rects.some((r) => r.bottom <= SITE_HEADER_PX));
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return visible;
}

/** Below lg only: a fixed bottom bar with the price and the same unlock button, for the long one-column paywall. */
export function StickyUnlockBar(props: Props) {
  const button = useUnlockButton(props, "sticky");
  const ref = useUnlockButtonRef(button.context, button.failedAttempt);
  // Out of the way of a checkout another button started; its own stays up, so focus stays on its button meanwhile.
  const startedElsewhere = button.checkout.redirecting && button.checkout.pending !== "sticky";
  const visible = useStickyVisible() && !startedElsewhere;
  return (
    <aside
      aria-label="Unlock the full kit"
      data-testid="sticky-unlock-bar"
      data-visible={visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)] transition-[translate,visibility] duration-200 ease-out motion-reduce:transition-none lg:hidden",
        visible ? "visible translate-y-0" : "invisible translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
        <p className="leading-tight">
          <Price price={button.price} struck={button.struck} className="text-xl font-semibold tracking-tight" />
          <span className="ml-1 text-xs text-muted-foreground">once</span>
          <span className="block text-xs text-muted-foreground">No subscription</span>
        </p>
        <UnlockButton
          ref={ref}
          id={button.buttonId}
          price={button.price}
          busy={button.checkout.redirecting}
          onClick={() => button.click(false)}
          className="px-3.5"
          describedBy={button.failure ? button.errorId : undefined}
        />
      </div>
      {button.failure ? (
        <div className="mx-auto max-w-6xl px-3 pb-3 sm:px-6">
          <CheckoutError failure={button.failure} isLoggedIn={button.context.isLoggedIn} onRetry={() => button.click(true)} className="mt-0" messageId={button.errorId} />
        </div>
      ) : null}
    </aside>
  );
}
