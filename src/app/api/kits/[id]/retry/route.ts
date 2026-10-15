import { after } from "next/server";
import { fulfilKit } from "@/lib/fulfil";
import { getKit, updateKit } from "@/lib/kits";

/** Lets a buyer restart generation after automatic retries ran out. */
export async function POST(_req: Request, ctx: RouteContext<"/api/kits/[id]/retry">) {
  const { id } = await ctx.params;
  const kit = await getKit(id);
  if (!kit) return Response.json({ error: "Kit not found" }, { status: 404 });
  if (!kit.paid || kit.status !== "failed") return Response.json({ status: kit.status });
  await updateKit(id, { status: "paid", attempts: 0, error: undefined });
  after(() => fulfilKit(id));
  return Response.json({ status: "paid" });
}
