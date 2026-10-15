import { after } from "next/server";
import { getSession } from "@/lib/auth";
import { devToolsEnabled } from "@/lib/dev-guard";
import { fulfilKit, recordPayment } from "@/lib/fulfil";
import { getKit } from "@/lib/kits";
import { isOwner } from "@/lib/progress";

/**
 * Preview/dev only: marks the caller's own kit as paid exactly as the Stripe
 * webhook would, so the payment-to-visible time can be measured without a card.
 */
export async function POST(req: Request) {
  if (!devToolsEnabled()) return Response.json({ error: "Not found" }, { status: 404 });
  const session = await getSession();
  const { kitId } = (await req.json().catch(() => ({}))) as { kitId?: string };
  const kit = typeof kitId === "string" ? await getKit(kitId) : null;
  if (!kit || !session || !isOwner(kit, session)) return Response.json({ error: "Log in as the kit's owner." }, { status: 403 });
  const t0 = Date.now();
  await recordPayment({ product: "kit", kitId: kit.id, email: session.email, ref: `sim_${Date.now().toString(36)}` });
  const after1 = await getKit(kit.id);
  after(() => fulfilKit(kit.id));
  return Response.json({ status: after1?.status, recordMs: Date.now() - t0, url: `/account/kits/${kit.id}?paid=1` });
}
