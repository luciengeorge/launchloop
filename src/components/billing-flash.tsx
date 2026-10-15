"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const BILLING_FLASHES: Record<string, { tone: "info" | "error"; message: string }> = {
  mock: { tone: "info", message: "Billing portal is unavailable in test mode (Stripe isn't configured)." },
  error: { tone: "error", message: "Couldn't open the billing portal. Please try again." },
};

/** Toasts a `?billing=` redirect note once, then drops the param so a refresh doesn't repeat it. */
export function BillingFlash() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const value = url.searchParams.get("billing");
    if (value === null) return;
    const flash = BILLING_FLASHES[value];
    if (flash) toast[flash.tone](flash.message, { id: `billing-${value}` });
    url.searchParams.delete("billing");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  return null;
}
