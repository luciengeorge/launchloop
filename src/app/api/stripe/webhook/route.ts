import { after } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { fulfilKit, recordPayment } from "@/lib/fulfil";
import { captureException } from "@/lib/observability";
import { stripe } from "@/lib/payments";
import { isProductId } from "@/lib/products";

export const maxDuration = 120;

export async function POST(req: Request) {
  const s = stripe();
  if (!s || !env.stripeWebhookSecret) {
    return Response.json({ error: "Stripe webhooks are not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing stripe-signature header." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(await req.text(), signature, env.stripeWebhookSecret);
  } catch (error) {
    captureException(error, { stage: "stripe.webhook.verify" });
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const product = session.metadata?.product;
    const kitId = session.metadata?.kitId;
    if (session.payment_status === "paid" && isProductId(product)) {
      try {
        await recordPayment({
          product,
          kitId,
          email: session.customer_details?.email ?? session.customer_email ?? undefined,
          ref: session.id,
          customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        });
      } catch (error) {
        captureException(error, { stage: "stripe.webhook.record", sessionId: session.id });
        return Response.json({ error: "Failed to record payment." }, { status: 500 });
      }
      if (product === "kit" && kitId) after(() => fulfilKit(kitId));
    }
  }

  return Response.json({ received: true });
}
