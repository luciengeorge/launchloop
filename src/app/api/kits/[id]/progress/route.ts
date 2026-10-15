import { getSession } from "@/lib/auth";
import { getKit } from "@/lib/kits";
import { getProgress, isOwner, setTaskDone } from "@/lib/progress";

/** Checklist progress, saved per kit for its logged-in owner. */
export async function GET(_req: Request, ctx: RouteContext<"/api/kits/[id]/progress">) {
  const { id } = await ctx.params;
  const [kit, session] = await Promise.all([getKit(id), getSession()]);
  if (!kit || !isOwner(kit, session)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ done: await getProgress(id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/progress">) {
  const { id } = await ctx.params;
  const [kit, session] = await Promise.all([getKit(id), getSession()]);
  if (!kit || !isOwner(kit, session)) return Response.json({ error: "Log in as the kit's owner to save progress." }, { status: 403 });
  if (!kit.paid) return Response.json({ error: "Unlock the kit to start the checklist." }, { status: 402 });
  const body = (await req.json().catch(() => ({}))) as { taskId?: unknown; done?: unknown };
  if (typeof body.taskId !== "string" || !/^[a-z]+(\.[a-z0-9]+)?$/.test(body.taskId) || typeof body.done !== "boolean") {
    return Response.json({ error: "Send { taskId, done }." }, { status: 400 });
  }
  return Response.json({ done: await setTaskDone(id, body.taskId, body.done) });
}
