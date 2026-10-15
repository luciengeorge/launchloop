"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const PRIVATE_ID = /^(\/(?:kit|account\/kits)\/)[^/]+/;

/**
 * Kit URLs are private links and query strings carry login tokens and checkout ids,
 * so analytics only ever sees the route shape plus UTM tags.
 */
export function scrubUrl(raw: string): string {
  const url = new URL(raw);
  url.pathname = url.pathname.replace(PRIVATE_ID, "$1[id]");
  for (const key of [...url.searchParams.keys()]) {
    if (!key.startsWith("utm_")) url.searchParams.delete(key);
  }
  url.hash = "";
  return url.toString();
}

export function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })} />
      <SpeedInsights beforeSend={(event) => ({ ...event, url: scrubUrl(event.url) })} />
    </>
  );
}
