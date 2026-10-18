import { after } from "next/server";
import { captureServerEvent, resolveDistinctId } from "@/lib/analytics-server";
import { attributionProperties } from "@/lib/attribution";
import { isEmail } from "@/lib/audience";
import { getSession } from "@/lib/auth";
import { isStripeMock } from "@/lib/env";
import { withAnalyticsId } from "@/lib/experiments";
import { fulfilKit, recordPayment } from "@/lib/fulfil";
import { getKit } from "@/lib/kits";
import { checkoutPrice } from "@/lib/payments";
import { LAUNCH_PROMO, isProductId, type ProductId } from "@/lib/products";
import type { Kit } from "@/lib/schema";

export const maxDuration = 120;

/** Test-mode stand-in for Stripe Checkout. Disabled whenever STRIPE_SECRET_KEY is set. */
export async function POST(req: Request) {
  if (!isStripeMock()) return Response.json({ error: "Mock checkout is disabled when Stripe is configured." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { product?: unknown; kitId?: unknown; email?: unknown; analyticsId?: unknown; promo?: unknown };
  if (!isProductId(body.product)) return Response.json({ error: "Unknown product." }, { status: 400 });
  if (!isEmail(body.email)) return Response.json({ error: "Enter a valid email so we can send your receipt." }, { status: 400 });

  const ref = `mock_${Date.now().toString(36)}`;
  const isLoggedIn = !!(await getSession());
  const promo = body.product === "kit" && body.promo === LAUNCH_PROMO.code;
  const track = (product: ProductId, kit?: Kit) =>
    after(() =>
      captureServerEvent("checkout_completed", {
        distinctId: resolveDistinctId(body.analyticsId),
        properties: { plan: product, kitId: kit?.id, ...attributionProperties(kit?.attribution), ...checkoutPrice(product, promo), isLoggedIn, mock: true, stripeSessionId: ref },
      }),
    );

  if (body.product === "kit") {
    const kit = typeof body.kitId === "string" ? await getKit(body.kitId) : null;
    if (!kit) return Response.json({ error: "Kit not found." }, { status: 404 });
    await recordPayment({ product: "kit", kitId: kit.id, email: body.email, ref });
    after(() => fulfilKit(kit.id));
    track("kit", kit);
    return Response.json({ url: withAnalyticsId(`/account/kits/${kit.id}?paid=1`, body.analyticsId) });
  }

  await recordPayment({ product: body.product, email: body.email, ref });
  track(body.product);
  return Response.json({ url: withAnalyticsId(`/ship-loop/thanks?plan=${body.product}`, body.analyticsId) });
}
