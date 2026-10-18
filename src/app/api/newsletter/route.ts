import { after } from "next/server";
import { addContact, isEmail, isUndeliverableEmail } from "@/lib/audience";
import { safeNext } from "@/lib/auth";
import { newsletterWelcomeEmail, sendEmail } from "@/lib/email";
import { RESERVED_EMAIL_ERROR } from "@/lib/login-errors";
import { PREVIEW_NEWSLETTER_ANCHOR, parsePlacement } from "@/lib/newsletter";
import { captureException } from "@/lib/observability";
import { readBody } from "@/lib/form-body";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`newsletter:${clientIp(req)}`, 10, 60 * 60 * 1000).ok) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const { data, isForm } = await readBody(req);
  const { email } = data;
  const placement = parsePlacement(data.placement);
  // No-JS posts go back to the page they came from (the footer has always gone to the home page).
  const back = (subscribed: boolean) => {
    const url = new URL(safeNext(data.next) ?? "/", req.url);
    url.searchParams.set("subscribed", subscribed ? "1" : "0");
    if (placement !== "footer") {
      url.searchParams.set("from", placement);
      url.hash = PREVIEW_NEWSLETTER_ANCHOR;
    }
    return Response.redirect(url, 303);
  };
  if (!isEmail(email)) return isForm ? back(false) : Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (isUndeliverableEmail(email)) return isForm ? back(false) : Response.json({ error: RESERVED_EMAIL_ERROR }, { status: 400 });
  try {
    const { created } = await addContact(email, "newsletter", { placement });
    // Only the first signup gets the checklist email, so re-submitting an address can't be used to spam it.
    if (created) {
      after(async () => {
        try {
          await sendEmail(await newsletterWelcomeEmail({ to: email.trim().toLowerCase() }));
        } catch (error) {
          captureException(error, { stage: "api.newsletter.welcome", placement });
        }
      });
    }
    return isForm ? back(true) : Response.json({ ok: true });
  } catch (error) {
    captureException(error, { stage: "api.newsletter" });
    return Response.json({ error: "Couldn't subscribe you right now. Please try again." }, { status: 500 });
  }
}
