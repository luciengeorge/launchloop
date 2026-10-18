"use client";

import { useState } from "react";
import { CheckoutButton } from "./checkout-button";
import { WaitlistForm } from "./waitlist-form";

/** `preorderOpen` is false when STRIPE_PRICE_SHIPLOOP_PREORDER isn't set; the waitlist is then the only CTA. */
export function ShipLoopPlans({ preorderOpen }: { preorderOpen: boolean }) {
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const preorder = plan === "yearly" && preorderOpen;
  return (
    <div id="plans" className="scroll-mt-20 space-y-6 rounded-2xl border-2 border-primary bg-card p-6 shadow-xl shadow-primary/10">
      <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-lg bg-muted p-1 text-sm">
        {(["monthly", "yearly"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={plan === p}
            onClick={() => setPlan(p)}
            className={`rounded-md px-3 py-1.5 font-medium transition ${plan === p ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {p === "monthly" ? "Monthly" : "Yearly (save 31%)"}
          </button>
        ))}
      </div>
      <p>
        <span className="text-4xl font-semibold tracking-tight">{plan === "monthly" ? "£12" : "£99"}</span>
        <span className="ml-1 text-muted-foreground">{plan === "monthly" ? "/month from launch" : preorder ? "one-time founding pre-order" : "/year from launch"}</span>
      </p>
      {preorder ? (
        <div className="space-y-3">
          <CheckoutButton product="shiploop_preorder" className="h-11 w-full text-base">
            Pre-order Ship Loop, £99 one-time
          </CheckoutButton>
          <p className="text-xs text-muted-foreground">
            The founding pre-order is a one-time £99 payment today. It covers your first year of Ship Loop once it launches. If Ship Loop isn&apos;t live within 12 months of
            your pre-order, we refund you in full automatically. If you change your mind before launch, we refund it in full.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="preorder-closed">
          {plan === "monthly"
            ? "Monthly plans open when Ship Loop launches. Join the waitlist and we'll email you the day it opens."
            : "Founding pre-orders aren't open right now. Join the waitlist and we'll email you as soon as they are."}
        </p>
      )}
      {preorder ? (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
      ) : null}
      <div id="waitlist" className="scroll-mt-20">
        <WaitlistForm plan={plan} />
      </div>
    </div>
  );
}
