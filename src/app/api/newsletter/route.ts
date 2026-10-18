import { after } from "next/server";
import { addContact, isEmail, isUndeliverableEmail } from "@/lib/audience";
import { safeNext, seeOther } from "@/lib/auth";
import { newsletterWelcomeEmail, sendEmail } from "@/lib/email";
import { normaliseEmail } from "@/lib/kits";
import { NEWSLETTER_ERRORS, type NewsletterErrorCode, type NewsletterPlacement, newsletterReturnPath, parsePlacement } from "@/lib/newsletter";
import { captureException, captureMessage } from "@/lib/observability";
import { readBody } from "@/lib/form-body";
import { newsletterLimit, welcomeEmailLimit } from "@/lib/rate-limit";
import { store } from "@/lib/store";

const WELCOME_CLAIM_TTL_SECONDS = 365 * 24 * 60 * 60;

export async function POST(req: Request) {
  const { data, isForm } = await readBody(req);
  const placement = parsePlacement(data.placement);
  const next = safeNext(data.next);
  const fail = (status: number, code: NewsletterErrorCode) =>
    isForm ? seeOther(newsletterReturnPath(next, placement, code)) : Response.json({ error: NEWSLETTER_ERRORS[code], code }, { status });

  try {
    if (!(await newsletterLimit(req)).ok) return fail(429, "rate");
    if (!isEmail(data.email)) return fail(400, "invalid");
    const email = normaliseEmail(data.email);
    if (isUndeliverableEmail(email)) return fail(400, "reserved");

    await addContact(email, "newsletter", { placement });
    after(() => sendWelcome(email, placement));
    return isForm ? seeOther(newsletterReturnPath(next, placement)) : Response.json({ ok: true });
  } catch (error) {
    captureException(error, { stage: "api.newsletter" });
    return fail(500, "server");
  }
}

/** At most one welcome email per address, ever: the claim is an atomic increment, so concurrent signups can't both send. */
async function sendWelcome(email: string, placement: NewsletterPlacement) {
  try {
    if ((await store().incr(`newsletter:welcome:${email}`, WELCOME_CLAIM_TTL_SECONDS)) !== 1) return;
    if (!(await welcomeEmailLimit()).ok) {
      captureMessage("Newsletter welcome email skipped: daily cap reached", { stage: "api.newsletter.welcome", placement });
      return;
    }
    await sendEmail(await newsletterWelcomeEmail({ to: email }));
  } catch (error) {
    captureException(error, { stage: "api.newsletter.welcome", placement });
  }
}
