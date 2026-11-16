import { listingFor } from "@/lib/copy";
import { availableDirectories, packUnavailableResponse } from "@/lib/directories";
import { directoriesCsv, utmLink } from "@/lib/directory-csv";
import { PACK_LOCKED, getPack } from "@/lib/directory-pack";

/** The whole database for a paid pack, with the buyer's UTM link and listing copy once they've added their product. */
export async function GET(_req: Request, { params }: RouteContext<"/api/directory-pack/[id]/csv">) {
  const pack = await getPack((await params).id);
  if (!pack) return Response.json(PACK_LOCKED, { status: 403 });
  const rows = await availableDirectories();
  if (!rows) return packUnavailableResponse();
  const { product, listings } = pack;
  const csv = directoriesCsv(
    rows,
    product && listings ? (row) => ({ your_link: utmLink(product.url, row), ...listingFor(listings, row) }) : undefined,
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="launchloop-directory-pack.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
