import { after } from "next/server";
import { isEmail } from "@/lib/audience";
import { isStripeMock } from "@/lib/env";
import { fulfilKit, recordPayment } from "@/lib/fulfil";
import { getKit } from "@/lib/kits";
import { isProductId } from "@/lib/products";

export const maxDuration = 120;

/** Test-mode stand-in for Stripe Checkout. Disabled whenever STRIPE_SECRET_KEY is set. */
export async function POST(req: Request) {
  if (!isStripeMock()) return Response.json({ error: "Mock checkout is disabled when Stripe is configured." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { product?: unknown; kitId?: unknown; email?: unknown };
  if (!isProductId(body.product)) return Response.json({ error: "Unknown product." }, { status: 400 });
  if (!isEmail(body.email)) return Response.json({ error: "Enter a valid email so we can send your receipt." }, { status: 400 });

  const ref = `mock_${Date.now().toString(36)}`;
  if (body.product === "kit") {
    const kit = typeof body.kitId === "string" ? await getKit(body.kitId) : null;
    if (!kit) return Response.json({ error: "Kit not found." }, { status: 404 });
    await recordPayment({ product: "kit", kitId: kit.id, email: body.email, ref });
    after(() => fulfilKit(kit.id));
    return Response.json({ url: `/kit/${kit.id}?paid=1` });
  }

  await recordPayment({ product: body.product, email: body.email, ref });
  return Response.json({ url: `/ship-loop/thanks?plan=${body.product}` });
}
