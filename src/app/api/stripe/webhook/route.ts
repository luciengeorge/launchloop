import { after } from "next/server";
import type Stripe from "stripe";
import { captureServerEvent, eventUuid, resolveDistinctId } from "@/lib/analytics-server";
import { attributionProperties, testProperties } from "@/lib/attribution";
import { env } from "@/lib/env";
import { featureProperties, parseExperiments, parseFallbacks } from "@/lib/experiments";
import type { KitOwnership } from "@/lib/accounts";
import { fulfilKit, recordPayment, type RecordedPayment } from "@/lib/fulfil";
import { captureException, logEvent } from "@/lib/observability";
import { deployEnv, stripeEventDecision } from "@/lib/deploy-env";
import { isPaidSession, sessionPromoCode, stripe } from "@/lib/payments";
import { isProductId, type ProductId } from "@/lib/products";
import { store } from "@/lib/store";

export const maxDuration = 120;

/** Stripe retries a failed delivery for up to three days; remember handled events a bit longer. */
const HANDLED_TTL_SECONDS = 7 * 24 * 60 * 60;
const handledKey = (eventId: string) => `stripe:event:${eventId}`;

type Outcome = "fulfilled" | "duplicate" | "awaiting_payment" | "unknown_product" | "ignored_env" | "ignored_type" | "record_failed";

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

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    logEvent("stripe.webhook", { eventId: event.id, type: event.type, outcome: "ignored_type" });
    return Response.json({ received: true });
  }

  const session = event.data.object;
  // Session id, payment status and where the kit went only: no emails, names or customer details in the logs.
  const log = (outcome: Outcome, ownership?: KitOwnership) =>
    logEvent("stripe.webhook", { eventId: event.id, type: event.type, sessionId: session.id, paymentStatus: session.payment_status, outcome, ownership });

  const decision = stripeEventDecision({ metadataEnv: session.metadata?.env, livemode: event.livemode, current: deployEnv(), secretKey: env.stripeSecretKey });
  if (!decision.handle) {
    log("ignored_env");
    return Response.json({ received: true, ignored: decision.reason });
  }
  if (await store().get(handledKey(event.id))) {
    log("duplicate");
    return Response.json({ received: true, duplicate: true });
  }

  const product = session.metadata?.product;
  const kitId = session.metadata?.kitId;
  if (!isPaidSession(session)) {
    // An async payment method (bank debit) settles later as checkout.session.async_payment_succeeded.
    await markHandled(event.id);
    log("awaiting_payment");
    return Response.json({ received: true });
  }
  if (!isProductId(product)) {
    await markHandled(event.id);
    log("unknown_product");
    return Response.json({ received: true });
  }

  let recorded: RecordedPayment;
  try {
    // Guest checkouts have no account behind them: the kit goes to the email Stripe collected (see accounts.ts).
    recorded = await recordPayment({
      product,
      kitId,
      email: session.customer_details?.email ?? session.customer_email ?? undefined,
      ref: session.id,
      customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
    });
  } catch (error) {
    captureException(error, { stage: "stripe.webhook.record", sessionId: session.id, eventId: event.id, product, kitId });
    after(() => trackFailure(event.id, session, product, "record", error));
    log("record_failed");
    // Not marked as handled, and non-2xx, so Stripe delivers it again. Recording is idempotent.
    return Response.json({ error: "Failed to record payment." }, { status: 500 });
  }

  await markHandled(event.id);
  // Writing the kit takes longer than Stripe should wait, so it runs after the response. It retries on its own
  // and the status poll and checkout return route restart it, so a failure here is reported rather than redelivered.
  if (product === "kit" && kitId) {
    after(() =>
      fulfilKit(kitId).catch((error: unknown) => {
        captureException(error, { stage: "stripe.webhook.fulfil", sessionId: session.id, eventId: event.id, kitId });
        return trackFailure(event.id, session, product, "fulfil", error);
      }),
    );
  }
  after(() => trackCompleted(s, session, product));
  log("fulfilled", recorded.ownership);
  return Response.json({ received: true });
}

/** Downstream steps are idempotent anyway; this lets a redelivered event skip them. A failed write only costs a redo. */
async function markHandled(eventId: string) {
  try {
    await store().set(handledKey(eventId), { at: new Date().toISOString() }, HANDLED_TTL_SECONDS);
  } catch (error) {
    captureException(error, { stage: "stripe.webhook.markHandled", eventId });
  }
}

/** The purchase event. Keyed on the session id, so webhook retries and the async-payment event don't double count. */
async function trackCompleted(s: Stripe, session: Stripe.Checkout.Session, product: ProductId) {
  const m = session.metadata ?? {};
  const promoCode = await sessionPromoCode(s, session);
  return captureServerEvent("checkout_completed", {
    distinctId: resolveDistinctId(m.ph_distinct_id),
    uuid: eventUuid(`checkout_completed:${session.id}`),
    properties: {
      plan: product,
      kitId: m.kitId,
      ...attributionProperties(m),
      price_id: m.price_id ?? "unknown",
      amount: session.payment_status === "no_payment_required" ? 0 : (session.amount_total ?? 0),
      currency: session.currency ?? "gbp",
      isLoggedIn: m.logged_in === "1",
      mock: false,
      stripeSessionId: session.id,
      ...(promoCode ? { promo_code: promoCode } : {}),
      ...featureProperties(parseExperiments(m), parseFallbacks(m.fallbacks)),
    },
  });
}

function trackFailure(eventId: string, session: Stripe.Checkout.Session, product: ProductId, stage: "record" | "fulfil", error: unknown) {
  const m = session.metadata ?? {};
  return captureServerEvent("checkout_fulfilment_failed", {
    distinctId: resolveDistinctId(m.ph_distinct_id),
    // One failure per event and stage, however many times Stripe redelivers it.
    uuid: eventUuid(`checkout_fulfilment_failed:${eventId}:${stage}`),
    properties: {
      plan: product,
      kitId: m.kitId,
      stripeSessionId: session.id,
      stripeEventId: eventId,
      stage,
      errorName: error instanceof Error ? error.name : typeof error,
      mock: false,
      ...testProperties(m),
    },
  });
}
