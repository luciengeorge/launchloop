"use client";

import { useState } from "react";
import { CheckoutButton } from "./checkout-button";
import { WaitlistForm } from "./waitlist-form";

export function ShipLoopPlans() {
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  return (
    <div className="space-y-6 rounded-2xl border-2 border-primary bg-card p-6 shadow-xl shadow-primary/10">
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
        <span className="ml-1 text-muted-foreground">{plan === "monthly" ? "/month" : "/year"}</span>
      </p>
      <div className="space-y-3">
        <CheckoutButton product={plan === "monthly" ? "shiploop_monthly" : "shiploop_yearly"} className="h-11 w-full text-base">
          Pre-order Ship Loop
        </CheckoutButton>
        <p className="text-xs text-muted-foreground">
          We charge your first {plan === "monthly" ? "month" : "year"} today. Fully refundable until launch. Recurring billing starts only once Ship Loop is live.
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <WaitlistForm plan={plan} />
    </div>
  );
}
