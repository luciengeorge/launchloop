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

/** /api/waitlist's answer when it couldn't store the signup, and the form's message for anything that isn't the API's. */
export const WAITLIST_SERVER_ERROR = "Couldn't add you right now. Please try again.";

export const isWaitlistSource = (v: unknown): v is WaitlistSource => typeof v === "string" && (WAITLIST_SOURCES as readonly string[]).includes(v);

export interface WaitlistResponse {
  ok: true;
  /** The email was already on the waitlist. */
  duplicate: boolean;
}
