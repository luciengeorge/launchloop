/**
 * First-touch attribution: the UTM tags and referring domain of the page a visitor landed on, and whether it was
 * internal QA traffic. Held in page memory in the browser, sent with the preview request, stored on the kit, copied
 * into Stripe Checkout metadata and read back by the webhook. Pure, so the browser, server and tests share it.
 */
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

export type Attribution = Partial<Record<UtmKey | "referring_domain", string>> & {
  /** Internal QA traffic: a landing tagged ?qa=1 or utm_source=qa. Only ever true, so analytics can filter on is_test = true. */
  is_test?: true;
};

/** `?qa=1` on the landing URL marks the visit as QA traffic, as does utm_source=qa. */
export const QA_PARAM = "qa";
const QA_SOURCE = "qa";

const isQaSource = (value: unknown) => typeof value === "string" && value.trim().toLowerCase() === QA_SOURCE;

/** Whether a landing URL's query string tags the visit as QA traffic. */
export function isQaLanding(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get(QA_PARAM) === "1" || isQaSource(params.get("utm_source"));
}

/**
 * Whether a request came from a QA-tagged page of this site, judged by its Referer with the same rule as isQaLanding.
 * A plain form post has no JavaScript to send isTest, but the browser still sends the page URL for a same-origin post.
 */
export function isQaReferer(req: Request): boolean {
  const referer = req.headers.get("referer");
  const page = referer ? URL.parse(referer) : null;
  if (!page || !isQaLanding(page.search)) return false;
  // This site's host as the request saw it, however the platform reports it.
  const hosts = [URL.parse(req.url)?.host, req.headers.get("host"), req.headers.get("x-forwarded-host")?.split(",")[0]?.trim()];
  return hosts.includes(page.host);
}

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
  // true from the browser and the kit record, "1" from Stripe metadata.
  if (raw.is_test === true || raw.is_test === "1" || isQaSource(out.utm_source)) out.is_test = true;
  return Object.keys(out).length ? out : undefined;
}

/** The landing page's UTMs plus the referrer's host, when the visitor came from another site, and whether it's QA traffic. */
export function readLandingAttribution(location: { search: string; hostname: string }, referrer: string): Attribution | undefined {
  const params = new URLSearchParams(location.search);
  const raw: Record<string, unknown> = Object.fromEntries(UTM_KEYS.map((key) => [key, params.get(key) ?? undefined]));
  const referrerHost = URL.parse(referrer)?.hostname;
  if (referrerHost && referrerHost.replace(/^www\./, "") !== location.hostname.replace(/^www\./, "")) raw.referring_domain = referrerHost;
  if (isQaLanding(location.search)) raw.is_test = true;
  return parseAttribution(raw);
}

/** A request from a QA-tagged visit marks the purchase as QA traffic, whatever the kit's own first touch was. */
export function withTestTraffic(attribution: Attribution | undefined, isTest: boolean): Attribution | undefined {
  return isTest ? { ...attribution, is_test: true } : attribution;
}

/** Stripe Checkout session / PaymentIntent metadata. Same keys as the PostHog event properties; values are strings. */
export function attributionMetadata(attribution: Attribution | undefined): Record<string, string> {
  const { is_test, ...rest } = parseAttribution(attribution) ?? {};
  return { ...rest, ...(is_test ? { is_test: "1" } : {}) } as Record<string, string>;
}

/** PostHog event properties from a kit's attribution or from Stripe metadata (which also holds product, kitId and experiments). */
export function attributionProperties(source: unknown): Attribution {
  return parseAttribution(source) ?? {};
}

export const isTestTraffic = (source: unknown): boolean => parseAttribution(source)?.is_test === true;

/** Just `is_test: true` for QA traffic, for events that don't carry the UTMs. */
export function testProperties(source: unknown): Pick<Attribution, "is_test"> {
  return isTestTraffic(source) ? { is_test: true } : {};
}
