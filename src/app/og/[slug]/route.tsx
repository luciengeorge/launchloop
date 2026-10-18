import { renderShareCard } from "@/lib/og-card";
import { cardPages } from "@/lib/pages";

export function generateStaticParams() {
  return cardPages().map(({ slug }) => ({ slug }));
}

export async function GET(_request: Request, { params }: RouteContext<"/og/[slug]">) {
  const { slug } = await params;
  const page = cardPages().find((p) => p.slug === slug);
  if (!page) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  return renderShareCard(page.card);
}
