"use client";

import Link from "next/link";
import { START_EVENT, type StartPlan } from "@/lib/start-intent";

/** This page's path with only its utm_ params (so attribution survives a reload) plus the plan. */
function startUrl(plan: StartPlan): string {
  const params = new URLSearchParams([...new URLSearchParams(location.search)].filter(([key]) => key.startsWith("utm_")));
  if (plan === "kit") params.set("plan", "kit");
  const qs = params.toString();
  return `${location.pathname}${qs ? `?${qs}` : ""}#start`;
}

/**
 * Leads into the kit form. If the form is on this page it scrolls to and focuses it (with the plan preselected);
 * otherwise it navigates client-side to /?plan=…#start. A full page load would start a new anonymous PostHog id
 * (memory persistence) and drop the landing page's UTMs from the funnel.
 */
export function StartLink({ plan = "free", className, children }: { plan?: StartPlan; className?: string; children: React.ReactNode }) {
  const href = plan === "kit" ? "/?plan=kit#start" : "/#start";
  return (
    <Link
      href={href}
      className={className}
      data-plan={plan}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (!document.getElementById("start")) return;
        e.preventDefault();
        history.replaceState(null, "", startUrl(plan));
        window.dispatchEvent(new CustomEvent(START_EVENT, { detail: { plan } }));
      }}
    >
      {children}
    </Link>
  );
}
