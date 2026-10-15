import { after } from "next/server";
import { fulfilKit, needsFulfilment } from "@/lib/fulfil";
import { getKit } from "@/lib/kits";

export const maxDuration = 120;

export async function GET(_req: Request, ctx: RouteContext<"/api/kits/[id]/status">) {
  const { id } = await ctx.params;
  const kit = await getKit(id);
  if (!kit) return Response.json({ error: "Kit not found" }, { status: 404 });

  if (needsFulfilment(kit)) after(() => fulfilKit(id));

  return Response.json(
    { status: kit.status, paid: kit.paid, emailed: !!kit.emailedAt, error: kit.error ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
