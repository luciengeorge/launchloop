import "server-only";
import { env, isEmailMock } from "./env";
import { resend } from "./email";
import { captureException } from "./observability";
import { store } from "./store";

export type ContactSource = "newsletter" | "waitlist" | "kit";

export const isEmail = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/** RFC 2606 / 6761 names (example.com, *.test, *.invalid…) can never receive mail, and Resend rejects them. */
export function isReservedEmailDomain(email: string): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1).trim().toLowerCase();
  return /(^|\.)example\.(com|net|org)$/.test(domain) || /\.(example|test|invalid|localhost|local)$/.test(domain);
}

/** Only enforced when real email is configured: mock mode (local dev, e2e) has no provider to reject them. */
export const isUndeliverableEmail = (email: string) => !isEmailMock() && isReservedEmailDomain(email);

/**
 * Stores a contact locally (always) and in Resend (when configured).
 * RESEND_SEGMENT_ID uses Resend's segments; RESEND_AUDIENCE_ID uses the legacy audiences API.
 * `existing` is true when this email was already stored for `source`.
 */
export async function addContact(email: string, source: ContactSource, extra: Record<string, string> = {}): Promise<{ existing: boolean }> {
  const normalised = email.trim().toLowerCase();
  const key = `contact:${source}:${normalised}`;
  const existing = await store().get<{ createdAt: string }>(key);
  await store().set(key, { email: normalised, source, ...extra, createdAt: existing?.createdAt ?? new Date().toISOString() });

  const r = resend();
  if (!r) return { existing: !!existing };
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
  return { existing: !!existing };
}
