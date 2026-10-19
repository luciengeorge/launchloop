import { siteUrl } from "@/lib/env";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { llmsText } from "@/lib/llms";

/** Expanded llms.txt with the full FAQ, for assistants that want everything in one fetch. */
export async function GET() {
  return new Response(llmsText(siteUrl(), true, await isLaunchPromoOn()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
