import { availableDirectories, packUnavailableResponse } from "@/lib/directories";
import { PACK_LOCKED, getPack, listingProductSchema, writeListings } from "@/lib/directory-pack";
import { captureException } from "@/lib/observability";
import { sharedRateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

/** Each run is one LLM call over every directory, paid for by us: a pack gets this many a day. */
const RUNS_PER_DAY = 20;

/** The buyer's product details in, listing copy for every directory written and stored on the pack. */
export async function POST(req: Request, { params }: RouteContext<"/api/directory-pack/[id]/listings">) {
  const pack = await getPack((await params).id);
  if (!pack) return Response.json(PACK_LOCKED, { status: 403 });
  const parsed = listingProductSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check your product details." }, { status: 400 });
  // Before the rate limit, so an outage doesn't use up the buyer's runs.
  const rows = await availableDirectories();
  if (!rows) return packUnavailableResponse();
  const limit = await sharedRateLimit(`packlistings:${pack.id}`, [{ limit: RUNS_PER_DAY, seconds: 24 * 60 * 60 }]);
  if (!limit.ok) return Response.json({ error: "You've rewritten your listings a lot today. Try again tomorrow." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  try {
    await writeListings(pack, parsed.data, rows);
    return Response.json({ ok: true });
  } catch (error) {
    captureException(error, { stage: "api.directoryPack.listings", packId: pack.id });
    return Response.json({ error: "Couldn't write your listings just now. Please try again." }, { status: 502 });
  }
}
