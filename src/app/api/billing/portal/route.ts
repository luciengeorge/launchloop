import { getSession, seeOther } from "@/lib/auth";
import { ensureStripeCustomer } from "@/lib/billing";
import { siteUrl } from "@/lib/env";
import { captureException } from "@/lib/observability";
import { stripe } from "@/lib/payments";
import { ensurePortalConfiguration } from "@/lib/stripe-branding";

/** Opens a Stripe Customer Portal session for the logged-in user, creating their Stripe customer if missing. */
export async function POST() {
  const session = await getSession();
  if (!session) return seeOther("/login?next=/account");
  const s = stripe();
  if (!s) return seeOther("/account?billing=mock");
  try {
    const customer = await ensureStripeCustomer(session.email);
    const configuration = await ensurePortalConfiguration();
    const portal = await s.billingPortal.sessions.create({
      customer,
      return_url: `${siteUrl()}/account`,
      ...(configuration ? { configuration } : {}),
    });
    return Response.redirect(portal.url, 303);
  } catch (error) {
    captureException(error, { stage: "api.billing.portal" });
    return seeOther("/account?billing=error");
  }
}
