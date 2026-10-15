"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { scrubUrl } from "@/lib/scrub-url";

export function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })} />
      <SpeedInsights beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })} />
    </>
  );
}
