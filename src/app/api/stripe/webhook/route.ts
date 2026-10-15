import { after } from "next/server";
import type Stripe from "stripe";
import { captureServerEvent, eventUuid, resolveDistinctId } from "@/lib/analytics-server";
import { env } from "@/lib/env";
import { fulfilKit, recordPayment } from "@/lib/fulfil";
import { captureException } from "@/lib/observability";
import { deployEnv, stripeEventDecision } from "@/lib/deploy-env";
import { stripe } from "@/lib/payments";
import { isProductId, type ProductId } from "@/lib/products";

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
    const decision = stripeEventDecision({ metadataEnv: session.metadata?.env, livemode: event.livemode, current: deployEnv(), secretKey: env.stripeSecretKey });
    if (!decision.handle) return Response.json({ received: true, ignored: decision.reason });
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
      after(() => trackCompleted(session, product));
    }
  }

  return Response.json({ received: true });
}

/** Keyed on the session id, so webhook retries and the async-payment event don't double count. */
function trackCompleted(session: Stripe.Checkout.Session, product: ProductId) {
  const m = session.metadata ?? {};
  return captureServerEvent("checkout_completed", {
    distinctId: resolveDistinctId(m.ph_distinct_id),
    uuid: eventUuid(`checkout_completed:${session.id}`),
    properties: {
      plan: product,
      kitId: m.kitId,
      price_id: m.price_id ?? "unknown",
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "gbp",
      isLoggedIn: m.logged_in === "1",
      mock: false,
      stripeSessionId: session.id,
    },
  });
}
