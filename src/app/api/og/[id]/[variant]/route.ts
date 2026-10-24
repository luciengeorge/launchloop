import { EXAMPLE_KIT } from "@/lib/example-kit";
import { isImageVariant } from "@/lib/image-variants";
import { renderKitImage } from "@/lib/images";
import { getKit } from "@/lib/kits";
import { captureException } from "@/lib/observability";

export async function GET(req: Request, ctx: RouteContext<"/api/og/[id]/[variant]">) {
  const { id, variant } = await ctx.params;
  const name = variant.replace(/\.png$/, "");
  if (!isImageVariant(name)) return Response.json({ error: "Unknown image size" }, { status: 404 });

  const kit = id === EXAMPLE_KIT.id ? EXAMPLE_KIT : await getKit(id);
  if (!kit) return Response.json({ error: "Kit not found" }, { status: 404 });

  try {
    const res = await renderKitImage(kit, name, { watermark: !kit.paid });
    // The paid URL asked for before payment: answer, but never let the watermarked image be cached under it.
    if (new URL(req.url).searchParams.get("v") === "paid" && !kit.paid) res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error) {
    captureException(error, { stage: "api.og", kitId: id, variant: name });
    return Response.json({ error: "Couldn't render that image." }, { status: 500 });
  }
}
