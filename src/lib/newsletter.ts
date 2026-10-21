import { RESERVED_EMAIL_ERROR } from "./login-errors";

/** Where a newsletter signup happened. Stored on the contact and sent with the `newsletter_subscribed` event. */
export type NewsletterPlacement = "footer" | "preview" | "blog";

export const parsePlacement = (value: unknown): NewsletterPlacement => (value === "preview" || value === "blog" ? value : "footer");

/** Resend's test sink (delivered@resend.dev, bounced@resend.dev, ...): only QA ever signs up with it. */
export const isResendTestAddress = (email: string) => /(^|\.)resend\.dev$/.test(email.slice(email.lastIndexOf("@") + 1).trim().toLowerCase());

/** The lead magnet: the public checklist guide, linked from the success state and the welcome email. */
export const LEAD_MAGNET = { title: "launch-day checklist", path: "/product-hunt-launch-checklist" } as const;

/**
 * Anchor of the in-page signup (post-preview on kit pages, end of post on blog pages), so a no-JS form post lands back on it.
 * Only one such block per page: the footer form has no id.
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
