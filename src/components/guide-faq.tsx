import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/env";
import type { Guide } from "@/lib/guides";

export type FaqItem = { q: string; a: string };

/** A guide's FAQ section with matching FAQPage JSON-LD. Answers are plain text so the markup and the schema say exactly the same thing. */
export function GuideFaq({ guide, title, items }: { guide: Guide; title: string; items: readonly FaqItem[] }) {
  const url = `${siteUrl()}/${guide.slug}`;
  return (
    <section aria-labelledby="faq">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          url,
          mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
        }}
      />
      <h2 id="faq">{title}</h2>
      <div className="mt-5 space-y-8">
        {items.map((item) => (
          <div key={item.q}>
            <h3>{item.q}</h3>
            <p className="mt-2">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
