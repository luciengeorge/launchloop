import "server-only";
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

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
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

/**
 * Fixed-window limits shared across instances via the store (Redis in
 * production). All windows are counted; the request fails if any is exceeded.
 */
export async function sharedRateLimit(key: string, windows: { limit: number; seconds: number }[]): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const now = Math.floor(Date.now() / 1000);
  const counts = await Promise.all(
    windows.map(async (w) => {
      const bucket = Math.floor(now / w.seconds);
      const count = await store().incr(`rl:${key}:${w.seconds}:${bucket}`, w.seconds);
      return { ...w, count, retryAfter: (bucket + 1) * w.seconds - now };
    }),
  );
  const over = counts.filter((c) => c.count > c.limit);
  return over.length ? { ok: false, retryAfterSeconds: Math.max(...over.map((c) => c.retryAfter)) } : { ok: true, retryAfterSeconds: 0 };
}
