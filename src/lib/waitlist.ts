/** Pure: shared by the Ship Loop waitlist form and /api/waitlist. */

/** Every Ship Loop waitlist signup is stored with this tag, whichever surface it came from. */
export const WAITLIST_TAG = "shiploop_waitlist";

/**
 * Store set of every waitlist email, so the whole list can be read with one SMEMBERS when Ship Loop launches.
 * Each email's record (tag, source, plan, createdAt) is at `contact:waitlist:<email>`.
 */
export const WAITLIST_MEMBERS_KEY = "contacts:waitlist";

/** Where the signup happened. */
export const WAITLIST_SOURCES = ["ship_loop_page", "kit_upsell"] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

/**
 * Kill switch for the free Ship Loop waitlist ask on the kit success page: a PostHog boolean flag (id 331856, project
 * 307574) run at 100%. Only `true` shows the ask; off, missing, an error or no answer in time hides it (fails closed).
 */
export const SHIPLOOP_WAITLIST_ASK_FLAG = "shiploop_waitlist_ask";

/** /api/waitlist's answer when it couldn't store the signup, and the form's message for a 5xx that isn't the API's. */
export const WAITLIST_SERVER_ERROR = "Couldn't add you right now. Please try again.";

export const isWaitlistSource = (v: unknown): v is WaitlistSource => typeof v === "string" && (WAITLIST_SOURCES as readonly string[]).includes(v);

export interface WaitlistResponse {
  ok: true;
  /** The email was already on the waitlist. */
  duplicate: boolean;
}

/** Why a waitlist request failed, for waitlist_error. Derived from the HTTP status only, never from the email or the server's message. */
export type WaitlistErrorReason = "network" | "invalid_email" | "rate_limited" | "server_error" | "http_error";

/** `status` 0: the request never got a response. */
export function waitlistErrorReason(status: number): WaitlistErrorReason {
  if (status === 0) return "network";
  if (status === 400) return "invalid_email";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "http_error";
}

/** Shown when the server sent no message of its own. Each one goes out with a retry and the email fallback, so none is a dead end. */
export const WAITLIST_ERROR_MESSAGES: Record<WaitlistErrorReason, string> = {
  network: "We couldn't reach LaunchLoop. Check your connection and try again.",
  invalid_email: "Enter a valid email address.",
  rate_limited: "Too many attempts. Try again in a little while.",
  server_error: WAITLIST_SERVER_ERROR,
  http_error: WAITLIST_SERVER_ERROR,
};
