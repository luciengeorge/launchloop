"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { checkoutKit, lastKitId, START_EVENT, type StartPlan } from "@/lib/start-intent";

/**
 * Leads into the kit form. If the form is on this page it scrolls to and focuses it (with the plan preselected);
 * otherwise it navigates to /?plan=…#start. With plan="kit" and a kit already generated in this browser, it goes
 * straight to Stripe checkout.
 */
export function StartLink({ plan = "free", className, children }: { plan?: StartPlan; className?: string; children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const href = plan === "kit" ? "/?plan=kit#start" : "/#start";
  return (
    <a
      href={href}
      className={className}
      aria-busy={busy || undefined}
      data-plan={plan}
      onClick={async (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        if (plan === "kit") {
          const existing = lastKitId();
          if (existing) {
            setBusy(true);
            if (await checkoutKit(existing)) return;
            setBusy(false);
          }
        }
        if (document.getElementById("start")) {
          history.replaceState(null, "", plan === "kit" ? "?plan=kit#start" : `${location.pathname}#start`);
          window.dispatchEvent(new CustomEvent(START_EVENT, { detail: { plan } }));
        } else {
          window.location.assign(href);
        }
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </a>
  );
}
