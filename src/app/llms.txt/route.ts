import { siteUrl } from "@/lib/env";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { llmsText } from "@/lib/llms";

/** https://llmstxt.org: a plain-language summary so AI assistants can describe LaunchLoop accurately. */
export async function GET() {
  return new Response(llmsText(siteUrl(), false, await isLaunchPromoOn()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
