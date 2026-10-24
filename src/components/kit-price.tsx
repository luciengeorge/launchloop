import { Fragment } from "react";
import { LAUNCH_PROMO, PRODUCTS } from "@/lib/products";
import { KIT_PRICE_TOKEN } from "@/lib/site";

const FULL = PRODUCTS.kit.priceLabel;

/**
 * The Launch Kit price on marketing pages. `promo` is isLaunchPromoOn() from the server: on, it's the
 * paywall's struck-through £19 then £14; off, the plain £19 string, exactly as before.
 * "display" is the big plan-card figure; "inline" sits in a sentence or a button. `placeholder`: an invisible layout
 * copy (the signed-in header's), so it carries no test id.
 */
export function KitPrice({ promo, size = "inline", placeholder = false }: { promo: boolean; size?: "inline" | "display"; placeholder?: boolean }) {
  const testId = placeholder ? undefined : "kit-price-promo";
  if (size === "display") {
    return promo ? (
      <span data-testid={testId}>
        <s className="mr-2 text-2xl text-muted-foreground">
          <span className="sr-only">Was </span>
          {FULL}
        </s>
        <span className="text-4xl font-semibold tracking-tight">
          <span className="sr-only">now </span>
          {LAUNCH_PROMO.priceLabel}
        </span>
      </span>
    ) : (
      <span className="text-4xl font-semibold tracking-tight">{FULL}</span>
    );
  }
  if (!promo) return FULL;
  // Opacity rather than a muted colour so the struck price reads on light text and on primary buttons.
  return (
    <span className="whitespace-nowrap" data-testid={testId}>
      <s className="opacity-60">
        <span className="sr-only">was </span>
        {FULL}
      </s>{" "}
      <span className="sr-only">now </span>
      {LAUNCH_PROMO.priceLabel}
    </span>
  );
}

/** Shared copy with KIT_PRICE_TOKEN in it (the FAQ), with each token rendered as <KitPrice>. */
export function PricedText({ text, promo }: { text: string; promo: boolean }) {
  return text.split(KIT_PRICE_TOKEN).map((part, i) => (
    <Fragment key={i}>
      {i > 0 ? <KitPrice promo={promo} /> : null}
      {part}
    </Fragment>
  ));
}

/** "LAUNCH14 applied at checkout", styled like the paywall's promo note. Renders nothing when the promo is off. */
export function KitPromoNote({ promo, className = "" }: { promo: boolean; className?: string }) {
  if (!promo) return null;
  return (
    <p className={`rounded-md bg-primary/10 px-3 py-2 text-xs ${className}`} data-testid="launch-promo-note">
      <span className="font-mono font-semibold text-primary">{LAUNCH_PROMO.code}</span> applied at checkout
    </p>
  );
}
