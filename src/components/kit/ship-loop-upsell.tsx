"use client";

import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";
import { buttonVariants } from "@/components/ui/button";
import { EXPERIMENTS } from "@/lib/experiments";
import { useExperiment } from "@/lib/use-experiment";

/** exp_shiploop_success_upsell: a soft Ship Loop offer on the kit success page. Control renders nothing. */
export function ShipLoopUpsell({ preorderOpen }: { preorderOpen: boolean }) {
  if (useExperiment(EXPERIMENTS.shipLoopUpsell) !== "treatment") return null;
  return (
    <section className="rounded-2xl border border-border bg-muted/40 p-5 sm:p-6" aria-labelledby="ship-loop-upsell-heading" data-testid="ship-loop-upsell">
      <h2 id="ship-loop-upsell-heading" className="text-lg font-semibold">
        You&apos;re in. Your kit is on its way to your inbox.
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Want help actually shipping it? Ship Loop is the weekly accountability loop for getting your launch out the door.
      </p>
      <p className="mt-3 text-sm">
        <span className="font-medium">Founding pre-order: £99, one time.</span> Pay once today for your first year; your subscription starts when Ship Loop launches.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {preorderOpen ? (
          <CheckoutButton product="shiploop_preorder" className="h-10 px-4" experiments={{ [EXPERIMENTS.shipLoopUpsell]: "treatment" }}>
            Pre-order Ship Loop, £99 one-time
          </CheckoutButton>
        ) : null}
        <Link href="/ship-loop#waitlist" className={buttonVariants({ variant: "ghost", className: "h-10 px-3" })}>
          Not yet? Join the free waitlist
        </Link>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Fully refundable on request until Ship Loop launches; auto-refunded in full if Ship Loop is not live within 12 months of the pre-order.
      </p>
    </section>
  );
}
