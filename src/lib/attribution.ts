/**
 * First-touch attribution: the UTM tags and referring domain of the page a visitor landed on. Held in page memory in
 * the browser (no cookies or storage), sent with the preview request, stored on the kit, copied into Stripe Checkout
 * metadata and read back by the webhook. Pure, so the browser, server and tests share it.
 */
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

export type Attribution = Partial<Record<UtmKey | "referring_domain", string>>;

/** Comfortably inside Stripe's 500-character metadata values. */
const MAX_UTM_LENGTH = 200;
const HOSTNAME = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

function cleanUtm(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
  return cleaned ? Array.from(cleaned).slice(0, MAX_UTM_LENGTH).join("") : undefined;
}

function cleanDomain(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const domain = value.trim().toLowerCase().replace(/^www\./, "");
  return HOSTNAME.test(domain) ? domain : undefined;
}

/** Keeps only known keys with sane values. Anything else (untrusted request bodies, Stripe metadata) is dropped. */
export function parseAttribution(value: unknown): Attribution | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const out: Attribution = {};
  for (const key of UTM_KEYS) {
    const cleaned = cleanUtm(raw[key]);
    if (cleaned) out[key] = cleaned;
  }
  const domain = cleanDomain(raw.referring_domain);
  if (domain) out.referring_domain = domain;
  return Object.keys(out).length ? out : undefined;
}

/** The landing page's UTMs plus the referrer's host, when the visitor came from another site. */
export function readLandingAttribution(location: { search: string; hostname: string }, referrer: string): Attribution | undefined {
  const params = new URLSearchParams(location.search);
  const raw: Record<string, string | undefined> = Object.fromEntries(UTM_KEYS.map((key) => [key, params.get(key) ?? undefined]));
  const referrerHost = URL.parse(referrer)?.hostname;
  if (referrerHost && referrerHost.replace(/^www\./, "") !== location.hostname.replace(/^www\./, "")) raw.referring_domain = referrerHost;
  return parseAttribution(raw);
}

/** Stripe Checkout session / PaymentIntent metadata. Same keys as the PostHog event properties. */
export function attributionMetadata(attribution: Attribution | undefined): Record<string, string> {
  return { ...parseAttribution(attribution) } as Record<string, string>;
}

/** PostHog event properties from a kit's attribution or from Stripe metadata (which also holds product, kitId and experiments). */
export function attributionProperties(source: unknown): Attribution {
  return parseAttribution(source) ?? {};
}
