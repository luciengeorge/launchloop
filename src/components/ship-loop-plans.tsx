"use client";

import { useState } from "react";
import { PreorderButton } from "./preorder-button";
import { WaitlistForm } from "./waitlist-form";

/**
 * Ship Loop isn't live yet: planned pricing and the waitlist. With `preorderOpen` (STRIPE_PRICE_SHIPLOOP_PREORDER is set),
 * Yearly also offers the one-time £99 founding pre-order. Monthly is waitlist only.
 */
export function ShipLoopPlans({ preorderOpen }: { preorderOpen: boolean }) {
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const preorder = plan === "yearly" && preorderOpen;
  return (
    <div id="plans" className="scroll-mt-20 space-y-6 rounded-2xl border-2 border-primary bg-card p-6 shadow-xl shadow-primary/10">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Ship Loop is coming soon</h2>
        <p className="text-sm text-muted-foreground">
          {preorderOpen ? "Pre-order as a founding member, or get notified when it launches." : "Get notified when it launches. Nothing to pay now."}
        </p>
      </div>
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
      {preorder ? (
        <div className="space-y-3" data-testid="preorder">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Founding pre-order</p>
            <p className="mt-1">
              <span className="text-4xl font-semibold tracking-tight">£99</span>
              <span className="ml-1 text-muted-foreground">one-time founding pre-order</span>
            </p>
          </div>
          <PreorderButton className="h-11 w-full text-base">Pre-order Ship Loop, £99 one-time</PreorderButton>
          <p className="text-xs text-muted-foreground">
            The founding pre-order is a one-time £99 payment today. It covers your first year of Ship Loop once it launches. If Ship Loop isn&apos;t live within 12 months of
            your pre-order, we refund you in full automatically. If you change your mind before launch, we refund it in full.
          </p>
          <div className="flex items-center gap-3 pt-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      ) : (
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Planned pricing</p>
          <p className="mt-1">
            <span className="text-4xl font-semibold tracking-tight">{plan === "monthly" ? "£12" : "£99"}</span>
            <span className="ml-1 text-muted-foreground">{plan === "monthly" ? "/month" : "/year"}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Not on sale yet. We&apos;ll confirm the price when Ship Loop launches.</p>
        </div>
      )}
      <div id="waitlist" className="scroll-mt-20">
        <WaitlistForm source="ship_loop_page" plan={plan} />
      </div>
    </div>
  );
}
