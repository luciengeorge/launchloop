import { RESERVED_EMAIL_ERROR } from "./login-errors";

/** Where a newsletter signup happened. Stored on the contact and sent with the `newsletter_subscribed` event. */
export type NewsletterPlacement = "footer" | "preview";

export const parsePlacement = (value: unknown): NewsletterPlacement => (value === "preview" ? "preview" : "footer");

/** The lead magnet: the public checklist guide, linked from the success state and the welcome email. */
export const LEAD_MAGNET = { title: "launch-day checklist", path: "/product-hunt-launch-checklist" } as const;

/** Anchor of the post-preview signup, so a no-JS form post lands back on its success message. */
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

/** Where a plain form post goes back to. Only the path of `next` is kept; the query and hash are ours. */
export function newsletterReturnPath(next: unknown, placement: NewsletterPlacement, error?: NewsletterErrorCode): string {
  const query = new URLSearchParams({ subscribed: error ? "0" : "1" });
  if (error) query.set("error", error);
  if (placement !== "footer") query.set("from", placement);
  const hash = error ? newsletterErrorAnchor(placement, error) : placement !== "footer" ? PREVIEW_NEWSLETTER_ANCHOR : "";
  return `${sameOriginPath(next)}?${query}${hash ? `#${hash}` : ""}`;
}
