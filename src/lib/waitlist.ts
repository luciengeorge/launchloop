/** Pure: shared by the Ship Loop waitlist form and /api/waitlist. */

/** Every Ship Loop waitlist signup is stored with this tag, whichever surface it came from. */
export const WAITLIST_TAG = "shiploop_waitlist";

/** Where the signup happened. */
export const WAITLIST_SOURCES = ["ship_loop_page", "kit_upsell"] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

export const isWaitlistSource = (v: unknown): v is WaitlistSource => typeof v === "string" && (WAITLIST_SOURCES as readonly string[]).includes(v);

export interface WaitlistResponse {
  ok: true;
  /** The email was already on the waitlist. */
  duplicate: boolean;
}
