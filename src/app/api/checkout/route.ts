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
import { checkoutPrice, createCheckoutUrl } from "@/lib/payments";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { product?: unknown; kitId?: unknown; email?: unknown; analyticsId?: unknown; experiments?: unknown; fallbacks?: unknown };
  const rejected = checkoutRejection(body.product);
  if (rejected) return Response.json({ error: rejected.error, code: rejected.code }, { status: rejected.status });

  const session = await getSession();
  const email = session?.email ?? (isEmail(body.email) ? body.email : undefined);
  // Kits are bought from an account so they land in /account and progress can be saved.
  if (!session) return Response.json({ error: "Confirm your email first so your kit is saved to your account.", code: "login_required" }, { status: 401 });
  const kit = typeof body.kitId === "string" ? await getKit(body.kitId) : null;
  if (!kit) return Response.json({ error: "That kit doesn't exist any more. Generate a new preview." }, { status: 404 });
  if (kit.paid) return Response.json({ url: `/account/kits/${kit.id}` });
  const kitId = kit.id;
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
    });
    if (launchPromo && promoFallback && kitId) {
      const properties = { flag: EXPERIMENTS.launchPromo, variant: launchPromo.variant, reason: "error", fallback: true, source: "checkout", remembered: launchPromo.source === "remembered", kitId } as const;
      captureMessage("exp_launch14_promo: PostHog didn't answer at checkout", properties);
      after(() => captureServerEvent("flag_fallback", { distinctId: analyticsId, properties }));
    }
    after(() =>
      captureServerEvent("checkout_started", {
        distinctId: analyticsId,
        properties: {
          plan: product,
          kitId,
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
    return Response.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
