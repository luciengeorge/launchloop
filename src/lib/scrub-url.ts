const PRIVATE_ID = /^(\/(?:kit|account\/kits)\/)[^/]+/;

/**
 * Kit URLs are private links and query strings carry login tokens and checkout ids,
 * so analytics only ever sees the route shape plus UTM tags.
 */
export function scrubUrl(raw: string): string {
  const url = new URL(raw);
  url.pathname = scrubPath(url.pathname);
  for (const key of [...url.searchParams.keys()]) {
    if (!key.startsWith("utm_")) url.searchParams.delete(key);
  }
  url.hash = "";
  return url.toString();
}

export const scrubPath = (path: string) => path.replace(PRIVATE_ID, "$1[id]");

const URLISH_KEY = /(url|referrer|pathname)$/i;

/** Scrubs every URL-like property PostHog attaches (current URL, referrer, entry URL, pathname and their $set_once copies). */
export function scrubProperties(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string" && URLISH_KEY.test(key)) out[key] = scrubValue(value);
    else if ((key === "$set" || key === "$set_once") && value && typeof value === "object") out[key] = scrubProperties(value as Record<string, unknown>);
    else out[key] = value;
  }
  return out;
}

function scrubValue(value: string): string {
  if (value.startsWith("/")) return scrubPath(value.split(/[?#]/)[0]!);
  try {
    return scrubUrl(value);
  } catch {
    return value;
  }
}
