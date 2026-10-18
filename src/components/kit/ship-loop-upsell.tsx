"use client";

import { PreorderButton } from "@/components/preorder-button";
import { WaitlistForm } from "@/components/waitlist-form";
import { EXPERIMENTS } from "@/lib/experiments";
import { useExperiment } from "@/lib/use-experiment";

/** exp_shiploop_success_upsell: a soft Ship Loop offer on the kit success page (waitlist, plus the £99 pre-order when `preorderOpen`). Control renders nothing. */
export function ShipLoopUpsell({ preorderOpen }: { preorderOpen: boolean }) {
  if (useExperiment(EXPERIMENTS.shipLoopUpsell)?.variant !== "treatment") return null;
  return (
    <section className="rounded-2xl border border-border bg-muted/40 p-5 sm:p-6" aria-labelledby="ship-loop-upsell-heading" data-testid="ship-loop-upsell">
      <h2 id="ship-loop-upsell-heading" className="text-lg font-semibold">
        You&apos;re in. Your kit is on its way to your inbox.
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Want help actually shipping it? Ship Loop drafts a post and an image for every release after launch.
      </p>
      <p className="mt-3 text-sm">
        <span className="font-medium">Ship Loop is coming soon.</span> Get notified when it launches. Nothing to pay now.
      </p>
      {preorderOpen ? (
        <div className="mt-4 space-y-2" data-testid="upsell-preorder">
          <p className="text-sm">
            <span className="font-medium">Or pre-order as a founding member: £99, one time.</span> It covers your first year of Ship Loop once it launches.
          </p>
          <PreorderButton className="h-10 px-4" experiments={{ [EXPERIMENTS.shipLoopUpsell]: "treatment" }}>
            Pre-order Ship Loop, £99 one-time
          </PreorderButton>
          <p className="text-xs text-muted-foreground">
            Fully refundable on request until Ship Loop launches; auto-refunded in full if Ship Loop is not live within 12 months of the pre-order.
          </p>
        </div>
      ) : null}
      <WaitlistForm source="kit_upsell" plan="yearly" className="mt-4 max-w-md" />
    </section>
  );
}
