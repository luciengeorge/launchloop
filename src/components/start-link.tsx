"use client";

import { START_EVENT, type StartPlan } from "@/lib/start-intent";

/**
 * Leads into the kit form. If the form is on this page it scrolls to and focuses it (with the plan preselected);
 * otherwise it navigates to /?plan=…#start.
 */
export function StartLink({ plan = "free", className, children }: { plan?: StartPlan; className?: string; children: React.ReactNode }) {
  const href = plan === "kit" ? "/?plan=kit#start" : "/#start";
  return (
    <a
      href={href}
      className={className}
      data-plan={plan}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (!document.getElementById("start")) return;
        e.preventDefault();
        history.replaceState(null, "", plan === "kit" ? "?plan=kit#start" : `${location.pathname}#start`);
        window.dispatchEvent(new CustomEvent(START_EVENT, { detail: { plan } }));
      }}
    >
      {children}
    </a>
  );
}
