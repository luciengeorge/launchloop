import { type Attribution, attributionProperties } from "@/lib/attribution";
import { isEmail } from "@/lib/audience";
import { captureServerEvent, resolveDistinctId } from "@/lib/analytics-server";
import { getSession } from "@/lib/auth";
import { ensureStripeCustomer } from "@/lib/billing";
import { isStripeMock } from "@/lib/env";
import { after } from "next/server";
import { featureProperties, parseExperiments } from "@/lib/experiments";
import { generateDraft } from "@/lib/generation";
import { getKit } from "@/lib/kits";
import { captureException } from "@/lib/observability";
import { checkoutPrice, createCheckoutUrl } from "@/lib/payments";
import { isProductId } from "@/lib/products";
import { clientIp, sharedRateLimit } from "@/lib/rate-limit";

/** Signed-out kit checkouts create live Stripe sessions without a login, so they're capped per IP. */
const GUEST_CHECKOUTS_PER_HOUR = Number(process.env.CHECKOUT_RATE_LIMIT_PER_HOUR ?? 20);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { product?: unknown; kitId?: unknown; email?: unknown; analyticsId?: unknown; experiments?: unknown };
  if (!isProductId(body.product)) return Response.json({ error: "Unknown product." }, { status: 400 });

  const session = await getSession();
  const email = session?.email ?? (isEmail(body.email) ? body.email : undefined);
  let kitId: string | undefined;
  let attribution: Attribution | undefined;
  if (body.product === "kit") {
    // Guests can buy too: Checkout collects their email and the webhook links the kit to it (see accounts.ts).
    if (!session) {
      const limit = await sharedRateLimit(`checkout:${clientIp(req)}`, [{ limit: GUEST_CHECKOUTS_PER_HOUR, seconds: 60 * 60 }]);
      if (!limit.ok) return Response.json({ error: "Too many checkout attempts. Try again in a few minutes.", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    }
    const kit = typeof body.kitId === "string" ? await getKit(body.kitId) : null;
    if (!kit) return Response.json({ error: "That kit doesn't exist any more. Generate a new preview." }, { status: 404 });
    if (kit.paid) return Response.json({ url: session ? `/account/kits/${kit.id}` : `/kit/${kit.id}` });
    kitId = kit.id;
    attribution = kit.attribution;
    // If the background budget was used up, start writing now so it's (nearly) ready after checkout.
    after(() => generateDraft(kit).catch(() => undefined));
  }

  const product = body.product;
  const analyticsId = resolveDistinctId(body.analyticsId);
  const isLoggedIn = !!session;
  // Trusted as sent: anyone can retry until a page shows the promo arm, so LAUNCH14's own
  // limits in Stripe (once per customer, first purchase, capped, expiring) are the real guard.
  const experiments = parseExperiments(body.experiments);
  try {
    // Only a signed-in (verified) email is tied to an existing Stripe customer; a guest-typed email
    // could belong to someone else, so it stays a plain `customer_email` prefill.
    const customer = session && !isStripeMock() ? await ensureStripeCustomer(session.email) : undefined;
    const { url, promo } = await createCheckoutUrl({ product, origin: new URL(req.url).origin, kitId, email, customer, analyticsId, isLoggedIn, experiments, attribution });
    after(() =>
      captureServerEvent("checkout_started", {
        distinctId: analyticsId,
        properties: {
          plan: product,
          kitId,
          ...attributionProperties(attribution),
          ...checkoutPrice(product, promo === "applied"),
          ...(promo === "none" ? {} : { promo }),
          ...featureProperties(experiments),
          isLoggedIn,
          mock: isStripeMock(),
        },
      }),
    );
    return Response.json({ url, promo });
  } catch (error) {
    captureException(error, { stage: "api.checkout", product, kitId });
    return Response.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
