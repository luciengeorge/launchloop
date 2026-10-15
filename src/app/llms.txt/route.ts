import { siteUrl } from "@/lib/env";
import { llmsText } from "@/lib/llms";

/** https://llmstxt.org: a plain-language summary so AI assistants can describe LaunchLoop accurately. */
export function GET() {
  return new Response(llmsText(siteUrl(), false), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
