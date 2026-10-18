"use client";

import { WaitlistForm } from "@/components/waitlist-form";
import { EXPERIMENTS } from "@/lib/experiments";
import { useExperiment } from "@/lib/use-experiment";

/** exp_shiploop_success_upsell: a soft Ship Loop waitlist offer on the kit success page. Control renders nothing. */
export function ShipLoopUpsell() {
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
        <span className="font-medium">Ship Loop is coming soon.</span> Join the waitlist, we&apos;ll email you when it launches. It&apos;s free.
      </p>
      <WaitlistForm source="kit_upsell" plan="yearly" className="mt-4 max-w-md" />
    </section>
  );
}
