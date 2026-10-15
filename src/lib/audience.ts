import "server-only";
import { env } from "./env";
import { resend } from "./email";
import { captureException } from "./observability";
import { store } from "./store";

export type ContactSource = "newsletter" | "waitlist" | "preorder" | "kit";

export const isEmail = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/**
 * Stores a contact locally (always) and in Resend (when configured).
 * RESEND_SEGMENT_ID uses Resend's segments; RESEND_AUDIENCE_ID uses the legacy audiences API.
 */
export async function addContact(email: string, source: ContactSource, extra: Record<string, string> = {}): Promise<void> {
  const normalised = email.trim().toLowerCase();
  const key = `contact:${source}:${normalised}`;
  const existing = await store().get<{ createdAt: string }>(key);
  await store().set(key, { email: normalised, source, ...extra, createdAt: existing?.createdAt ?? new Date().toISOString() });

  const r = resend();
  if (!r) return;
  try {
    const { error } = env.resendSegmentId
      ? await r.contacts.create({ email: normalised, unsubscribed: false, segments: [{ id: env.resendSegmentId }] })
      : env.resendAudienceId
        ? await r.contacts.create({ email: normalised, unsubscribed: false, audienceId: env.resendAudienceId })
        : await r.contacts.create({ email: normalised, unsubscribed: false });
    if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
  } catch (error) {
    captureException(error, { stage: "audience.addContact", source });
  }
}
