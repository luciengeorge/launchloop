import { getKit } from "@/lib/kits";
import { captureException } from "@/lib/observability";
import { buildKitZip, zipFileName } from "@/lib/zip";

export async function GET(_req: Request, ctx: RouteContext<"/api/kits/[id]/zip">) {
  const { id } = await ctx.params;
  const kit = await getKit(id);
  if (!kit) return Response.json({ error: "Kit not found" }, { status: 404 });
  if (!kit.paid) return Response.json({ error: "The ZIP is part of the paid kit." }, { status: 402 });
  if (kit.status !== "ready") return Response.json({ error: "Your kit is still being generated." }, { status: 409 });

  try {
    const zip = await buildKitZip(kit);
    return new Response(Buffer.from(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFileName(kit)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    captureException(error, { stage: "api.kits.zip", kitId: id });
    return Response.json({ error: "Couldn't build the ZIP. Please try again." }, { status: 500 });
  }
}
