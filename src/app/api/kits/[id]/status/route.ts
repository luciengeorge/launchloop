import { after } from "next/server";
import { MAX_ATTEMPTS, fulfilKit, needsFulfilment } from "@/lib/fulfil";
import { getDraft } from "@/lib/generation";
import { getKit } from "@/lib/kits";

export const maxDuration = 120;

export async function GET(_req: Request, ctx: RouteContext<"/api/kits/[id]/status">) {
  const { id } = await ctx.params;
  const kit = await getKit(id);
  if (!kit) return Response.json({ error: "Kit not found" }, { status: 404 });

  if (needsFulfilment(kit)) after(() => fulfilKit(id));

  // Section count only (no content), so the paid page can show sections as they land.
  const sectionsReady = kit.paid && kit.status !== "ready" ? Object.keys((await getDraft(id)).sections).length : undefined;
  return Response.json(
    { status: kit.status, paid: kit.paid, emailed: !!kit.emailedAt, error: kit.error ?? null, finalFailure: kit.status === "failed" && kit.attempts >= MAX_ATTEMPTS, sectionsReady },
    { headers: { "Cache-Control": "no-store" } },
  );
}
