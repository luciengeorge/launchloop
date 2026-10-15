import { getSession, seeOther } from "@/lib/auth";
import { getBillingCustomer } from "@/lib/billing";
import { siteUrl } from "@/lib/env";
import { captureException } from "@/lib/observability";
import { stripe } from "@/lib/payments";

/** Opens a Stripe Customer Portal session for the logged-in Ship Loop subscriber. */
export async function POST() {
  const session = await getSession();
  if (!session) return seeOther("/login?next=/account");
  const s = stripe();
  if (!s) return seeOther("/account?billing=mock");
  try {
    const customer = await getBillingCustomer(session.email);
    if (!customer) return seeOther("/account?billing=none");
    const portal = await s.billingPortal.sessions.create({ customer, return_url: `${siteUrl()}/account` });
    return Response.redirect(portal.url, 303);
  } catch (error) {
    captureException(error, { stage: "api.billing.portal" });
    return seeOther("/account?billing=error");
  }
}
