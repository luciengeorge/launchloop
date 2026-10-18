import { isEmail } from "@/lib/audience";
import { captureServerEvent, resolveDistinctId } from "@/lib/analytics-server";
import { getSession } from "@/lib/auth";
import { ensureStripeCustomer } from "@/lib/billing";
import { isStripeMock } from "@/lib/env";
import { after } from "next/server";
import { PreorderUnavailableError, RecurringPriceError } from "@/lib/checkout-session";
import { EXPERIMENTS, featureProperties, parseExperiments } from "@/lib/experiments";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { generateDraft } from "@/lib/generation";
import { getKit } from "@/lib/kits";
import { captureException } from "@/lib/observability";
import { checkoutPrice, createCheckoutUrl } from "@/lib/payments";
import { isProductId } from "@/lib/products";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { product?: unknown; kitId?: unknown; email?: unknown; analyticsId?: unknown; experiments?: unknown };
  if (!isProductId(body.product)) return Response.json({ error: "Unknown product." }, { status: 400 });

  const session = await getSession();
  const email = session?.email ?? (isEmail(body.email) ? body.email : undefined);
  let kitId: string | undefined;
  if (body.product === "kit") {
    // Kits are bought from an account so they land in /account and progress can be saved.
    if (!session) return Response.json({ error: "Confirm your email first so your kit is saved to your account.", code: "login_required" }, { status: 401 });
    const kit = typeof body.kitId === "string" ? await getKit(body.kitId) : null;
    if (!kit) return Response.json({ error: "That kit doesn't exist any more. Generate a new preview." }, { status: 404 });
    if (kit.paid) return Response.json({ url: `/account/kits/${kit.id}` });
    kitId = kit.id;
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
    // No variant from the page (it never read the flag): use the one the marketing pages show, so a
    // £14 seen on home or /pricing is the Stripe total. A variant the paywall sent is kept as is.
    if (product === "kit" && !experiments[EXPERIMENTS.launchPromo]) {
      experiments[EXPERIMENTS.launchPromo] = (await isLaunchPromoOn()) ? "treatment" : "control";
    }
    // Only a signed-in (verified) email is tied to an existing Stripe customer; a guest-typed email
    // could belong to someone else, so it stays a plain `customer_email` prefill.
    const customer = session && !isStripeMock() ? await ensureStripeCustomer(session.email) : undefined;
    const { url, promo } = await createCheckoutUrl({ product, origin: new URL(req.url).origin, kitId, email, customer, analyticsId, isLoggedIn, experiments });
    after(() =>
      captureServerEvent("checkout_started", {
        distinctId: analyticsId,
        properties: {
          plan: product,
          kitId,
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
    // A Ship Loop price that's missing, not in this Stripe account or recurring falls back to the waitlist, never a 502.
    if (error instanceof PreorderUnavailableError || (product !== "kit" && error instanceof RecurringPriceError)) {
      return Response.json({ error: "Ship Loop pre-orders aren't open right now. Join the waitlist and we'll email you when they are.", code: "preorder_unavailable" }, { status: 503 });
    }
    return Response.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
