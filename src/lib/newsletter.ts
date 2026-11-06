import type { DeployEnv } from "./deploy-env";
import { RESERVED_EMAIL_ERROR } from "./login-errors";

/**
 * Where a newsletter signup happened. Stored on the contact and sent with `newsletter_form_viewed` and `newsletter_subscribed`.
 * `blog` is the end-of-post block, `blog_inline` / `home_inline` the blocks behind `newsletter-inline-signup`, and
 * `newsletter` the signup on the public archive (/newsletter and its issues).
 */
export const NEWSLETTER_PLACEMENTS = ["footer", "preview", "blog", "blog_inline", "home_inline", "newsletter"] as const;
export type NewsletterPlacement = (typeof NEWSLETTER_PLACEMENTS)[number];

/** Anything unknown (an old cached page, a hand-made post) is the footer, as it always was. */
export const parsePlacement = (value: unknown): NewsletterPlacement =>
  typeof value === "string" && (NEWSLETTER_PLACEMENTS as readonly string[]).includes(value) ? (value as NewsletterPlacement) : "footer";

/**
 * Whether `newsletter-inline-signup` is on. `NEWSLETTER_INLINE=off` is a kill that doesn't need PostHog; `on` forces it
 * outside production (local and e2e builds). Otherwise only a flag value of exactly `true` turns it on, and the flag
 * isn't read at all when the override decides.
 */
export async function resolveInlineFlag({ override, env, flag }: FlagInputs): Promise<boolean> {
  return forcedFlag(override, env) ?? (await flag()) === true;
}

/**
 * Whether `newsletter-calendar-reward` is on. Same overrides as resolveInlineFlag. A flag value of `true` is on and any
 * other answer is off, but no answer at all (no such flag, no PostHog key, an error or a timeout) is on in Vercel
 * Preview only, so Preview runs the new reward before the flag exists and production stays as it was.
 */
export async function resolveCalendarFlag({ override, env, flag }: FlagInputs): Promise<boolean> {
  const forced = forcedFlag(override, env);
  if (forced !== undefined) return forced;
  const value = await flag();
  return value === undefined ? env === "preview" : value === true;
}

type FlagInputs = { override: string | undefined; env: DeployEnv; flag: () => Promise<unknown> };

function forcedFlag(override: string | undefined, env: DeployEnv): boolean | undefined {
  const forced = override?.trim().toLowerCase();
  if (forced === "off") return false;
  if (forced === "on" && env !== "production") return true;
  return undefined;
}

/** Resend's test sink (delivered@resend.dev, bounced@resend.dev, ...): only QA ever signs up with it. */
export const isResendTestAddress = (email: string) => /(^|\.)resend\.dev$/.test(email.slice(email.lastIndexOf("@") + 1).trim().toLowerCase());

/**
 * What a signup gets: the public checklist guide, or the 7-day launch calendar when `newsletter-calendar-reward` is on.
 * Both are normal public pages; the reward is getting the link by email straight away.
 */
export const LEAD_MAGNETS = {
  checklist: { title: "launch-day checklist", short: "checklist", path: "/product-hunt-launch-checklist" },
  calendar: { title: "7-day launch calendar", short: "calendar", path: "/7-day-launch-calendar" },
} as const;

export type NewsletterReward = keyof typeof LEAD_MAGNETS;

export const newsletterReward = (calendarOn: boolean): NewsletterReward => (calendarOn ? "calendar" : "checklist");

/** Signup copy per reward, shared by every placement that names it. */
export const SIGNUP_COPY = {
  checklist: {
    label: "Email for the launch-day checklist",
    button: "Send me the checklist",
    postTitle: "Get my launch-day checklist",
    body: "I'll email you my launch-day checklist now, then one launch teardown a week. Short, practical, easy to unsubscribe.",
    footerHint: "I'll send you my launch-day checklist straight away, then one launch teardown a week.",
  },
  calendar: {
    label: "Email for the 7-day launch calendar",
    button: "Send me the calendar",
    postTitle: "Get my 7-day launch calendar",
    body: "I'll email you my 7-day launch calendar now, then one launch teardown a week. Short, practical, easy to unsubscribe.",
    footerHint: "I'll send you my 7-day launch calendar straight away, then one launch teardown a week.",
  },
} as const satisfies Record<NewsletterReward, Record<string, string>>;

/** The welcome email's links, tagged so their visits show up as the welcome campaign. */
export function welcomeLink(base: string, path: string, content?: string): string {
  const query = new URLSearchParams({ utm_source: "newsletter", utm_medium: "email", utm_campaign: "welcome" });
  if (content) query.set("utm_content", content);
  return `${base}${path}?${query}`;
}

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
