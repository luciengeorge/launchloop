import type { DeployEnv } from "./deploy-env";
import { RESERVED_EMAIL_ERROR } from "./login-errors";

/**
 * Where a newsletter signup happened. Stored on the contact and sent with `newsletter_form_viewed` and `newsletter_subscribed`.
 * `blog` is the end-of-post block and `blog_inline` / `home_inline` the blocks behind `newsletter-inline-signup`.
 */
export const NEWSLETTER_PLACEMENTS = ["footer", "preview", "blog", "blog_inline", "home_inline"] as const;
export type NewsletterPlacement = (typeof NEWSLETTER_PLACEMENTS)[number];

/** Anything unknown (an old cached page, a hand-made post) is the footer, as it always was. */
export const parsePlacement = (value: unknown): NewsletterPlacement =>
  typeof value === "string" && (NEWSLETTER_PLACEMENTS as readonly string[]).includes(value) ? (value as NewsletterPlacement) : "footer";

/**
 * Whether `newsletter-inline-signup` is on. `NEWSLETTER_INLINE=off` is a kill that doesn't need PostHog; `on` forces it
 * outside production (local and e2e builds). Otherwise only a flag value of exactly `true` turns it on, and the flag
 * isn't read at all when the override decides.
 */
export async function resolveInlineFlag({ override, env, flag }: { override: string | undefined; env: DeployEnv; flag: () => Promise<unknown> }): Promise<boolean> {
  const forced = override?.trim().toLowerCase();
  if (forced === "off") return false;
  if (forced === "on" && env !== "production") return true;
  return (await flag()) === true;
}

/** Resend's test sink (delivered@resend.dev, bounced@resend.dev, ...): only QA ever signs up with it. */
export const isResendTestAddress = (email: string) => /(^|\.)resend\.dev$/.test(email.slice(email.lastIndexOf("@") + 1).trim().toLowerCase());

/** The lead magnet: the public checklist guide, linked from the success state and the welcome email. */
export const LEAD_MAGNET = { title: "launch-day checklist", path: "/product-hunt-launch-checklist" } as const;

/**
 * Anchor of the in-page signup (post-preview on kit pages, after the intro or at the end of blog posts, under the home
 * hero), so a no-JS form post lands back on it. Only one such block per page: the footer form has no id.
 */
export const PREVIEW_NEWSLETTER_ANCHOR = "newsletter";

/** Shared by /api/newsletter (JSON errors and form redirects) and the form, which reads `?error=<code>`. */
export const NEWSLETTER_ERRORS = {
  invalid: "Enter a valid email address.",
  reserved: RESERVED_EMAIL_ERROR,
  rate: "Too many attempts. Try again later.",
  server: "Couldn't subscribe you right now. Please try again.",
} as const;

export type NewsletterErrorCode = keyof typeof NEWSLETTER_ERRORS;

export const newsletterError = (code: unknown): string | undefined =>
  typeof code === "string" && Object.hasOwn(NEWSLETTER_ERRORS, code) ? NEWSLETTER_ERRORS[code as NewsletterErrorCode] : undefined;

/** Id of the no-JS message for a failed post, revealed with :target because static pages can't read the query on the server. */
export const newsletterErrorAnchor = (placement: NewsletterPlacement, code: NewsletterErrorCode) => `newsletter-${placement}-${code}`;

const BASE = "http://launchloop.invalid";

/** Same-origin path from `next`, judged after URL parsing, which resolves dot segments and turns `\` into `/`. Anything else is "/". */
function sameOriginPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) return "/";
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return "/";
  }
  if (url.origin !== BASE || /^\/[/\\]/.test(url.pathname) || url.pathname.includes("\\")) return "/";
  return url.pathname;
}

/**
 * What happened to the welcome email on a successful signup: sent now, already claimed by an earlier
 * signup of the same address, or skipped (daily cap reached, or the claim failed).
 */
export type WelcomeOutcome = "sent" | "existing" | "skipped";

export const parseWelcome = (value: unknown): WelcomeOutcome => (value === "existing" || value === "skipped" ? value : "sent");

export type NewsletterResult = { ok: true; welcome: WelcomeOutcome } | { ok: false; error: NewsletterErrorCode };

/**
 * Where a plain form post goes back to, for every outcome. The only place `next` is trusted:
 * just its path is kept, and the query and hash are ours.
 */
export function newsletterReturnPath(next: unknown, placement: NewsletterPlacement, result: NewsletterResult): string {
  const query = new URLSearchParams({ subscribed: result.ok ? "1" : "0" });
  if (!result.ok) query.set("error", result.error);
  else if (result.welcome !== "sent") query.set("welcome", result.welcome);
  if (placement !== "footer") query.set("from", placement);
  const hash = !result.ok ? newsletterErrorAnchor(placement, result.error) : placement !== "footer" ? PREVIEW_NEWSLETTER_ANCHOR : "";
  return `${sameOriginPath(next)}?${query}${hash ? `#${hash}` : ""}`;
}
