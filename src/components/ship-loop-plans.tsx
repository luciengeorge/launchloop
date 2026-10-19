import { WaitlistForm } from "./waitlist-form";

/** Ship Loop isn't on sale: no price, no plans, just the free waitlist. */
export function ShipLoopPlans() {
  // On lg the card is sticky, so on short screens it scrolls inside itself rather than running off the bottom of the viewport.
  return (
    <div
      id="plans"
      className="scroll-mt-20 space-y-6 rounded-2xl border-2 border-primary bg-card p-6 shadow-xl shadow-primary/10 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:overscroll-contain"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Ship Loop is coming soon</h2>
        <p className="text-sm text-muted-foreground">
          Join the waitlist, we&apos;ll email you when it launches. It&apos;s free.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Not on sale, so there&apos;s nothing to buy. Joining the waitlist doesn&apos;t commit you to anything.</p>
      <div id="waitlist" className="scroll-mt-20">
        <WaitlistForm source="ship_loop_page" />
      </div>
    </div>
  );
}
