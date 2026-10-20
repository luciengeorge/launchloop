import "server-only";
import { kitErrorBody, rateLimitedBody } from "./errors";
import { IngestError, normaliseKitInput } from "./ingest";
import { SAMPLE_INPUT } from "./ingest/sample";
import { captureExceptionThrottled } from "./observability";
import { PREVIEW_LIMITS } from "./site";
import { store } from "./store";

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Best-effort fixed-window limiter, per server instance. Good enough to stop
 * casual abuse of the free preview; use a shared store before scaling out.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  return { ok: true, retryAfterSeconds: 0 };
}

/** The key rate limits count against. IPv6 addresses are cut to their /64, since one subscriber usually gets a whole /64. */
export function clientIp(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  return ip.includes(":") ? ipv6Prefix64(ip) : ip;
}

/** "2001:db8:a:b:1:2:3:4" and "2001:db8:a:b::9" both give "2001:db8:a:b::/64". IPv4-mapped addresses give the IPv4. */
export function ipv6Prefix64(raw: string): string {
  const ip = raw.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  const halves = ip.split("::");
  if (halves.length > 2) return ip;
  const parts = (s: string | undefined) => (s ? s.split(":") : []);
  // An embedded IPv4 tail (64:ff9b::1.2.3.4) takes the room of two groups.
  const width = (groups: string[]) => groups.reduce((n, g) => n + (g.includes(".") ? 2 : 1), 0);
  const head = parts(halves[0]);
  const tail = halves.length === 2 ? parts(halves[1]) : [];
  const missing = 8 - width(head) - width(tail);
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return ip;
  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail].slice(0, 4);
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return ip;
  return `${groups.map((g) => parseInt(g, 16).toString(16)).join(":")}::/64`;
}

const PREVIEWS_PER_HOUR = Number(process.env.PREVIEW_RATE_LIMIT_PER_HOUR ?? PREVIEW_LIMITS.perHour);
const PREVIEWS_PER_DAY = Number(process.env.PREVIEW_RATE_LIMIT_PER_DAY ?? PREVIEW_LIMITS.perDay);

/** One budget per IP for everything that reads a repo and calls the LLM for free: previews and tool generations. */
export function freePreviewLimit(req: Request) {
  return sharedRateLimit(`kits:${clientIp(req)}`, [
    { limit: PREVIEWS_PER_HOUR, seconds: 60 * 60 },
    { limit: PREVIEWS_PER_DAY, seconds: 24 * 60 * 60 },
  ]);
}

const REFUNDS_PER_HOUR = Number(process.env.PREVIEW_REFUNDS_PER_HOUR ?? 10);
const REFUNDS_PER_DAY = Number(process.env.PREVIEW_REFUNDS_PER_DAY ?? 30);

/**
 * How many failed runs an IP gets back. Each one still cost a GitHub or site fetch, so past this a
 * failure counts like a preview and one IP can't drain the shared GitHub quota with missing repos.
 */
function refundAllowance(ip: string) {
  return sharedRateLimit(`kits-refunds:${ip}`, [
    { limit: REFUNDS_PER_HOUR, seconds: 60 * 60 },
    { limit: REFUNDS_PER_DAY, seconds: 24 * 60 * 60 },
  ]);
}

/** A free run's place in its IP's budget. */
export interface PreviewSlot {
  /**
   * Gives the slot back, for a run that ended before any model call completed (a private or missing
   * repo, an unreachable site, the AI down). Within the refund allowance only. Never throws.
   */
  refund(): Promise<void>;
}

const NO_SLOT: PreviewSlot = { refund: async () => {} };

function previewSlot(ip: string, counted: CountedWindow[]): PreviewSlot {
  let refunded = false;
  return {
    async refund() {
      if (refunded) return;
      refunded = true;
      try {
        if ((await refundAllowance(ip)).ok) await uncount(counted);
      } catch (error) {
        captureExceptionThrottled("rate-limit.refund", error, { stage: "rate-limit.refund" });
      }
    },
  };
}

export type FreePreviewGate = { refused: Response } | { refused: null; slot: PreviewSlot };

const DEFAULT_GLOBAL_DAILY_CAP = 1500;

/** A missing or malformed value falls back to the default rather than switching the cap off. */
function globalDailyCap(): number {
  const raw = process.env.PREVIEW_GLOBAL_DAILY_CAP?.trim();
  const cap = raw ? Number(raw) : NaN;
  return Number.isFinite(cap) && cap >= 0 ? cap : DEFAULT_GLOBAL_DAILY_CAP;
}

/** Kill switch: FREE_PREVIEWS_DISABLED=1 stops every free LLM call without touching paid generation. */
export const freePreviewsDisabled = () => process.env.FREE_PREVIEWS_DISABLED?.trim() === "1";

/** Spend cap shared by every IP: free previews and tool generations per UTC day. */
async function overGlobalDailyCap(): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const used = await store().incr(`cap:previews:${day}`, 2 * 24 * 60 * 60);
  return used > globalDailyCap();
}

const busy = () => Response.json(kitErrorBody("busy"), { status: 503 });

/**
 * Runs before any free LLM work (the preview and the free tools). Returns the response to send
 * when the request is refused, or the slot it took to go ahead. Paid generation never goes through here.
 *
 * - The input is validated before anything is counted, so a malformed URL never uses up a slot.
 * - Inputs that fail later (a private or missing repo, an unreachable site) are refunded by the
 *   caller through `slot.refund()`, up to the refund allowance (see refundAllowance).
 * - A refused request (429, or busy from the global cap) gives its per-IP slot straight back, so
 *   retrying while limited doesn't eat into the day's budget.
 * - The sample app is exempt from both counters: it's served from the 24-hour dedupe cache.
 * - The per-IP limit is checked first so one noisy IP can't use up the global cap for everyone.
 *   The global cap counts every attempt that passes the per-IP limit and is never refunded.
 * - Fails closed: if the store (Upstash) errors, the request gets the "busy" 503 and Sentry gets
 *   the error. Kits and briefs live in the same store, so failing open would spend model calls on
 *   previews that can't be saved, and drop abuse protection exactly when nobody's watching.
 */
export async function freePreviewGate(req: Request, rawInput: string): Promise<FreePreviewGate> {
  if (freePreviewsDisabled()) return { refused: busy() };
  let input: string;
  try {
    input = normaliseKitInput(rawInput);
  } catch (error) {
    if (error instanceof IngestError) return { refused: Response.json(kitErrorBody(error.code, error.userMessage), { status: 422 }) };
    throw error;
  }
  if (input === SAMPLE_INPUT) return { refused: null, slot: NO_SLOT };
  try {
    const limit = await freePreviewLimit(req);
    if (!limit.ok) {
      await uncount(limit.counted);
      return { refused: Response.json(rateLimitedBody(limit.retryAfterSeconds), { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }) };
    }
    if (await overGlobalDailyCap()) {
      await uncount(limit.counted);
      return { refused: busy() };
    }
    return { refused: null, slot: previewSlot(clientIp(req), limit.counted) };
  } catch (error) {
    captureExceptionThrottled("rate-limit.store", error, { stage: "rate-limit.store" });
    return { refused: busy() };
  }
}

const OG_PREVIEWS_PER_HOUR = Number(process.env.OG_PREVIEW_RATE_LIMIT_PER_HOUR ?? 60);

/** The OG preview only fetches a page and its image (no LLM), so it gets its own, larger budget. */
export function ogPreviewLimit(req: Request) {
  return sharedRateLimit(`og:${clientIp(req)}`, [{ limit: OG_PREVIEWS_PER_HOUR, seconds: 60 * 60 }]);
}

const NEWSLETTER_POSTS_PER_HOUR = Number(process.env.NEWSLETTER_RATE_LIMIT_PER_HOUR ?? 10);

/** Newsletter signups per IP. Shared across instances, because a signup can send a welcome email to any address. */
export function newsletterLimit(req: Request) {
  return sharedRateLimit(`newsletter:${clientIp(req)}`, [{ limit: NEWSLETTER_POSTS_PER_HOUR, seconds: 60 * 60 }]);
}

const WELCOME_EMAILS_PER_DAY = Number(process.env.NEWSLETTER_WELCOME_DAILY_CAP ?? 200);

/** Global cap on newsletter welcome emails per day, across all IPs. Past it, people still subscribe but get no email. */
export function welcomeEmailLimit() {
  return sharedRateLimit("newsletter-welcome", [{ limit: WELCOME_EMAILS_PER_DAY, seconds: 24 * 60 * 60 }]);
}

/** One window's counter that a request incremented, and when (epoch seconds) that window ends. */
export interface CountedWindow {
  key: string;
  seconds: number;
  resetsAt: number;
}

/**
 * Fixed-window limits shared across instances via the store (Redis in
 * production). All windows are counted; the request fails if any is exceeded.
 * `retryAfterSeconds` is the time until the latest exceeded window ends, from this request's clock.
 */
export async function sharedRateLimit(
  key: string,
  windows: { limit: number; seconds: number }[],
): Promise<{ ok: boolean; retryAfterSeconds: number; counted: CountedWindow[] }> {
  const now = Math.floor(Date.now() / 1000);
  const counts = await Promise.all(
    windows.map(async (w) => {
      const bucket = Math.floor(now / w.seconds);
      const counterKey = `rl:${key}:${w.seconds}:${bucket}`;
      const count = await store().incr(counterKey, w.seconds);
      const resetsAt = (bucket + 1) * w.seconds;
      return { ...w, count, key: counterKey, resetsAt, retryAfter: resetsAt - now };
    }),
  );
  const counted = counts.map(({ key, seconds, resetsAt }) => ({ key, seconds, resetsAt }));
  const over = counts.filter((c) => c.count > c.limit);
  return over.length ? { ok: false, retryAfterSeconds: Math.max(...over.map((c) => c.retryAfter)), counted } : { ok: true, retryAfterSeconds: 0, counted };
}

/** Takes back what sharedRateLimit counted, in windows that haven't ended yet (an ended window is never read again). */
async function uncount(counted: CountedWindow[]): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await Promise.all(counted.filter((c) => c.resetsAt > now).map((c) => store().decr(c.key, c.seconds)));
}
