import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/env";
import { type Guide, guidePath } from "@/lib/guides";
import { faqPage } from "@/lib/structured-data";

export type FaqItem = { q: string; a: string };

/** An FAQ section with matching FAQPage JSON-LD for the page at `path`. Answers are plain text so the markup and the schema say exactly the same thing. */
export function Faq({ path, title, items }: { path: string; title: string; items: readonly FaqItem[] }) {
  const url = `${siteUrl()}${path}`;
  return (
    <section aria-labelledby="faq">
      <JsonLd data={{ "@context": "https://schema.org", ...faqPage(`${url}#faq`, items), url }} />
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

export function GuideFaq({ guide, title, items }: { guide: Guide; title: string; items: readonly FaqItem[] }) {
  return <Faq path={guidePath(guide)} title={title} items={items} />;
}
