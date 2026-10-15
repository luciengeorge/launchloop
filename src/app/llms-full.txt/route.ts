import { siteUrl } from "@/lib/env";
import { llmsText } from "@/lib/llms";

/** Expanded llms.txt with the full FAQ, for assistants that want everything in one fetch. */
export function GET() {
  return new Response(llmsText(siteUrl(), true), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
