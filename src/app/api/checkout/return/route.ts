import { after } from "next/server";
import { withAnalyticsId } from "@/lib/experiments";
import { fulfilKit, recordPayment } from "@/lib/fulfil";
import { captureException } from "@/lib/observability";
import { checkoutDecision, stripe } from "@/lib/payments";
import { isProductId } from "@/lib/products";

export const maxDuration = 120;

/**
 * Stripe success_url. Verifies the session server-side so the buyer gets their
 * kit even if the webhook is slow or not forwarded (e.g. local development).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const s = stripe();
  if (!s || !sessionId) return Response.redirect(new URL("/", url), 303);

  try {
    const session = await s.checkout.sessions.retrieve(sessionId);
    // Previews never receive the webhook, so this verified lookup is how they fulfil.
    if (!checkoutDecision(session).handle) return Response.redirect(new URL("/?checkout=error", url), 303);
    const product = session.metadata?.product;
    const kitId = session.metadata?.kitId;
    if (session.payment_status !== "paid" || !isProductId(product) || !kitId) {
      return Response.redirect(new URL(kitId ? `/kit/${kitId}?checkout=pending` : "/ship-loop?checkout=pending", url), 303);
    }
    // Same anonymous id on the success page, so its flags and any upsell checkout join this purchase.
    const aid = session.metadata?.ph_distinct_id;
    const email = session.customer_details?.email ?? session.customer_email ?? undefined;
    await recordPayment({ product, kitId, email, ref: session.id, customerId: typeof session.customer === "string" ? session.customer : session.customer?.id });
    after(() => fulfilKit(kitId));
    return Response.redirect(new URL(withAnalyticsId(`/account/kits/${kitId}?paid=1`, aid), url), 303);
  } catch (error) {
    captureException(error, { stage: "api.checkout.return", sessionId });
    return Response.redirect(new URL("/?checkout=error", url), 303);
  }
}
