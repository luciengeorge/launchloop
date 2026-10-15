import { isImageVariant } from "@/lib/image-variants";
import { renderKitImage } from "@/lib/images";
import { getKit } from "@/lib/kits";
import { captureException } from "@/lib/observability";

export async function GET(_req: Request, ctx: RouteContext<"/api/og/[id]/[variant]">) {
  const { id, variant } = await ctx.params;
  const name = variant.replace(/\.png$/, "");
  if (!isImageVariant(name)) return Response.json({ error: "Unknown image size" }, { status: 404 });

  const kit = await getKit(id);
  if (!kit) return Response.json({ error: "Kit not found" }, { status: 404 });

  try {
    return renderKitImage(kit, name, { watermark: !kit.paid });
  } catch (error) {
    captureException(error, { stage: "api.og", kitId: id, variant: name });
    return Response.json({ error: "Couldn't render that image." }, { status: 500 });
  }
}
