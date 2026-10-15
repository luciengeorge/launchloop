import { isEmail } from "@/lib/audience";
import { getSession } from "@/lib/auth";
import { after } from "next/server";
import { generateDraft } from "@/lib/generation";
import { getKit } from "@/lib/kits";
import { captureException } from "@/lib/observability";
import { createCheckoutUrl } from "@/lib/payments";
import { isProductId } from "@/lib/products";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { product?: unknown; kitId?: unknown; email?: unknown };
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

  try {
    const url = await createCheckoutUrl({ product: body.product, origin: new URL(req.url).origin, kitId, email });
    return Response.json({ url });
  } catch (error) {
    captureException(error, { stage: "api.checkout", product: body.product, kitId });
    return Response.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
