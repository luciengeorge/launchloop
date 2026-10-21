import { after } from "next/server";
import { captureServerEvent, resolveDistinctId } from "@/lib/analytics-server";
import { addContact, isEmail, isUndeliverableEmail } from "@/lib/audience";
import { seeOther } from "@/lib/auth";
import { newsletterWelcomeEmail, sendEmail } from "@/lib/email";
import { normaliseEmail } from "@/lib/kits";
import {
  NEWSLETTER_ERRORS,
  type NewsletterErrorCode,
  type NewsletterPlacement,
  type NewsletterResult,
  type WelcomeOutcome,
  newsletterReturnPath,
  parsePlacement,
} from "@/lib/newsletter";
import { captureException, captureMessage } from "@/lib/observability";
import { readBody } from "@/lib/form-body";
import { newsletterLimit, welcomeEmailLimit } from "@/lib/rate-limit";
import { store } from "@/lib/store";

const WELCOME_CLAIM_TTL_SECONDS = 365 * 24 * 60 * 60;

const STATUS: Record<NewsletterErrorCode, number> = { invalid: 400, reserved: 400, rate: 429, server: 500 };

export async function POST(req: Request) {
  const { data, isForm } = await readBody(req);
  const placement = parsePlacement(data.placement);
  // Every response goes through here, so a form post's redirect always comes from newsletterReturnPath.
  const respond = (result: NewsletterResult) => {
    if (isForm) return seeOther(newsletterReturnPath(data.next, placement, result));
    return result.ok ? Response.json({ ok: true, welcome: result.welcome }) : Response.json({ error: NEWSLETTER_ERRORS[result.error], code: result.error }, { status: STATUS[result.error] });
  };

  try {
    if (!(await newsletterLimit(req)).ok) return respond({ ok: false, error: "rate" });
    if (!isEmail(data.email)) return respond({ ok: false, error: "invalid" });
    const email = normaliseEmail(data.email);
    if (isUndeliverableEmail(email)) return respond({ ok: false, error: "reserved" });

    await addContact(email, "newsletter", { placement });
    const welcome = await claimWelcome(email, placement);
    if (welcome === "sent") after(() => sendWelcome(email, placement));
    after(() => trackSignup(data, isForm, placement, welcome));
    return respond({ ok: true, welcome });
  } catch (error) {
    captureException(error, { stage: "api.newsletter" });
    return respond({ ok: false, error: "server" });
  }
}

/**
 * At most one welcome email per address, ever: the claim is an atomic increment, so concurrent signups can't both send.
 * Claimed before responding so the success message can say whether an email is on its way.
 */
async function claimWelcome(email: string, placement: NewsletterPlacement): Promise<WelcomeOutcome> {
  try {
    if ((await store().incr(`newsletter:welcome:${email}`, WELCOME_CLAIM_TTL_SECONDS)) !== 1) return "existing";
    if (!(await welcomeEmailLimit()).ok) {
      captureMessage("Newsletter welcome email skipped: daily cap reached", { stage: "api.newsletter.welcome", placement });
      return "skipped";
    }
    return "sent";
  } catch (error) {
    captureException(error, { stage: "api.newsletter.welcomeClaim", placement });
    return "skipped";
  }
}

/**
 * The page's anonymous id when the form's fetch sent one, so the event joins that visit's pageview and UTMs; a plain
 * form post has none and gets a server id. Never the email.
 */
function trackSignup(data: Record<string, unknown>, isForm: boolean, placement: NewsletterPlacement, welcome: WelcomeOutcome) {
  return captureServerEvent("newsletter_subscribed", {
    distinctId: resolveDistinctId(isForm ? undefined : data.analyticsId),
    properties: {
      placement,
      welcome,
      submitted: isForm ? "form" : "js",
      ...(isForm ? {} : { is_webdriver: data.isWebdriver === true }),
      ...(!isForm && data.isTest === true ? { is_test: true } : {}),
    },
  });
}

async function sendWelcome(email: string, placement: NewsletterPlacement) {
  try {
    await sendEmail(await newsletterWelcomeEmail({ to: email }));
  } catch (error) {
    captureException(error, { stage: "api.newsletter.welcome", placement });
  }
}
