"use client";

import { useState } from "react";
import { WaitlistForm } from "./waitlist-form";

/** Ship Loop isn't on sale: planned pricing and the free waitlist. */
export function ShipLoopPlans() {
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  return (
    <div id="plans" className="scroll-mt-20 space-y-6 rounded-2xl border-2 border-primary bg-card p-6 shadow-xl shadow-primary/10">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Ship Loop is coming soon</h2>
        <p className="text-sm text-muted-foreground">
          Join the waitlist, we&apos;ll email you when it launches. It&apos;s free.
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
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Planned pricing</p>
        <p className="mt-1">
          <span className="text-4xl font-semibold tracking-tight">{plan === "monthly" ? "£12" : "£99"}</span>
          <span className="ml-1 text-muted-foreground">{plan === "monthly" ? "/month" : "/year"}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Not on sale yet. We&apos;ll confirm the price when Ship Loop launches.</p>
      </div>
      <div id="waitlist" className="scroll-mt-20">
        <WaitlistForm source="ship_loop_page" plan={plan} />
      </div>
    </div>
  );
}
