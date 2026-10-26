import { attributionProperties, testProperties, withTestTraffic } from "@/lib/attribution";
import { isEmail } from "@/lib/audience";
import { captureServerEvent, resolveDistinctId } from "@/lib/analytics-server";
import { getSession } from "@/lib/auth";
import { ensureStripeCustomer } from "@/lib/billing";
import { isStripeMock } from "@/lib/env";
import { after } from "next/server";
import { checkoutRejection } from "@/lib/checkout-session";
import { EXPERIMENTS, featureProperties, parseExperiments, parseFallbacks } from "@/lib/experiments";
import { generateDraft } from "@/lib/generation";
import { resolveKitPromo } from "@/lib/kit-promo";
import { getKit } from "@/lib/kits";
import { captureException, captureMessage } from "@/lib/observability";
import { CheckoutUnavailableError, checkoutPrice, createCheckoutUrl } from "@/lib/payments";
import { clientIp, sharedRateLimit } from "@/lib/rate-limit";

/** Shown in the unlock panel, which keeps its unlock button, so the buyer can retry or write to us. */
const CHECKOUT_UNAVAILABLE = "Checkout is offline for a few minutes. Your preview is saved: try again shortly, or email hello@launchloop.dev and we'll send you a payment link.";

/** Signed-out kit checkouts create live Stripe sessions without a login, so they're capped per IP. */
const GUEST_CHECKOUTS_PER_HOUR = Number(process.env.CHECKOUT_RATE_LIMIT_PER_HOUR ?? 20);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { product?: unknown; kitId?: unknown; email?: unknown; analyticsId?: unknown; experiments?: unknown; fallbacks?: unknown; isTest?: unknown };
  const rejected = checkoutRejection(body.product);
  if (rejected) return Response.json({ error: rejected.error, code: rejected.code }, { status: rejected.status });

  const session = await getSession();
  const email = session?.email ?? (isEmail(body.email) ? body.email : undefined);
  // Guests can buy too: Checkout collects their email and the webhook links the kit to it (see accounts.ts).
  if (!session) {
    const limit = await sharedRateLimit(`checkout:${clientIp(req)}`, [{ limit: GUEST_CHECKOUTS_PER_HOUR, seconds: 60 * 60 }]);
    if (!limit.ok) return Response.json({ error: "Too many checkout attempts. Try again in a few minutes.", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }
  const kit = typeof body.kitId === "string" ? await getKit(body.kitId) : null;
  if (!kit) return Response.json({ error: "That kit doesn't exist any more. Generate a new preview." }, { status: 404 });
  if (kit.paid) return Response.json({ url: session ? `/account/kits/${kit.id}` : `/kit/${kit.id}` });
  const kitId = kit.id;
  // A QA-tagged kit, or a checkout from a QA-tagged tab: checkout_started, flag_fallback and (via metadata) the webhook's events carry is_test.
  const attribution = withTestTraffic(kit.attribution, body.isTest === true);
  // If the background budget was used up, start writing now so it's (nearly) ready after checkout.
  after(() => generateDraft(kit).catch(() => undefined));

  const product = "kit" as const;
  const analyticsId = resolveDistinctId(body.analyticsId);
  const isLoggedIn = !!session;
  // Other experiments are logged as the page served them. exp_launch14_promo is never taken from the
  // request: the server resolves it for the kit exactly as the paywall did (resolveKitPromo), and only
  // the server's answer decides LAUNCH14. Stripe's own limits on the code stay the backstop.
  const experiments = parseExperiments(body.experiments);
  delete experiments[EXPERIMENTS.launchPromo];
  const fallbacks = parseFallbacks(body.fallbacks).filter((key) => key in experiments);
  const launchPromo = kitId ? await resolveKitPromo(kitId) : undefined;
  if (launchPromo) {
    experiments[EXPERIMENTS.launchPromo] = launchPromo.variant;
    if (launchPromo.fallback) fallbacks.push(EXPERIMENTS.launchPromo);
  }
  // PostHog didn't answer for the kit, so the variant came from what it last assigned (or is control).
  const promoFallback = launchPromo && (launchPromo.source === "remembered" || launchPromo.fallback === "error");
  try {
    // Only a signed-in (verified) email is tied to an existing Stripe customer; a guest-typed email
    // could belong to someone else, so it stays a plain `customer_email` prefill.
    const customer = session && !isStripeMock() ? await ensureStripeCustomer(session.email) : undefined;
    const { url, promo } = await createCheckoutUrl({
      product,
      origin: new URL(req.url).origin,
      kitId,
      email,
      customer,
      analyticsId,
      isLoggedIn,
      experiments,
      fallbacks,
      attribution,
    });
    if (launchPromo && promoFallback && kitId) {
      const properties = { flag: EXPERIMENTS.launchPromo, variant: launchPromo.variant, reason: "error", fallback: true, source: "checkout", remembered: launchPromo.source === "remembered", kitId } as const;
      captureMessage("exp_launch14_promo: PostHog didn't answer at checkout", properties);
      after(() => captureServerEvent("flag_fallback", { distinctId: analyticsId, properties: { ...properties, ...testProperties(attribution) } }));
    }
    after(() =>
      captureServerEvent("checkout_started", {
        distinctId: analyticsId,
        properties: {
          plan: product,
          kitId,
          ...attributionProperties(attribution),
          ...checkoutPrice(product, promo === "applied"),
          ...(promo === "none" ? {} : { promo }),
          ...featureProperties(experiments, fallbacks),
          isLoggedIn,
          mock: isStripeMock(),
        },
      }),
    );
    return Response.json({ url, promo });
  } catch (error) {
    captureException(error, { stage: "api.checkout", product, kitId });
    if (error instanceof CheckoutUnavailableError) return Response.json({ error: CHECKOUT_UNAVAILABLE, code: "checkout_unavailable" }, { status: 503 });
    return Response.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
