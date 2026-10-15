import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { TaglineChecker } from "@/components/tools/tagline-checker";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { siteUrl } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { breadcrumbs } from "@/lib/structured-data";
import { TAGLINE_FAQ, TAGLINE_CHECKER as tool } from "@/lib/tools";

export const metadata: Metadata = {
  ...pageMetadata({ title: tool.metaTitle, description: tool.description, path: tool.path, image: { url: `${tool.path}/opengraph-image`, alt: tool.imageAlt } }),
  robots: { index: true, follow: true },
};

const EXAMPLES = [
  { weak: "AI-powered platform for productivity", strong: "Turn your GitHub repo into a launch kit", why: "Names the input and the result. Anyone with a repo knows it's for them." },
  { weak: "The ultimate launch tool for makers", strong: "Launch copy and images, written from your code", why: "“Ultimate” is a claim nobody believes. Say what it produces instead." },
  { weak: "Revolutionary screenshot management.", strong: "Find any screenshot by the text inside it", why: "A concrete action beats an adjective, and taglines don't need a full stop." },
  { weak: "SNAPSHELF: SCREENSHOTS, SORTED", strong: "Search your screenshots like you search email", why: "Capitals shout, and the name is already shown right above the tagline." },
  { weak: "Seamless meeting notes 🚀", strong: "Turn customer calls into ranked product specs", why: "Emoji and hype take space. The outcome and the audience do the work." },
  { weak: "Feedback management for modern teams", strong: "Customer feedback to specs, without the spreadsheet", why: "The weak one passes every check and still says nothing. The “[action] without [pain]” formula makes the benefit obvious." },
] as const;

const prose =
  "space-y-5 leading-relaxed [&_h2]:mt-14 [&_h2]:scroll-mt-20 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_p]:text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-foreground";

export default function TaglineCheckerPage() {
  const base = siteUrl();
  const url = `${base}${tool.path}`;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              "@id": `${url}#app`,
              name: "Product Hunt Tagline Checker",
              url,
              description: tool.description,
              image: `${url}/opengraph-image`,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              browserRequirements: "Requires JavaScript",
              inLanguage: "en-GB",
              isAccessibleForFree: true,
              featureList: [
                "Live 60-character count",
                "Checks for trailing full stops, all caps, emoji, vague hype and a repeated product name",
                "Product Hunt feed preview",
                "Three tagline options generated from a GitHub repo or live URL",
              ],
              offers: { "@type": "Offer", price: "0", priceCurrency: "GBP", availability: "https://schema.org/InStock" },
              publisher: { "@id": `${base}/#organization`, "@type": "Organization", name: SITE.name, url: `${base}/` },
            },
            {
              "@type": "FAQPage",
              "@id": `${url}#faq`,
              mainEntity: TAGLINE_FAQ.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
            },
            breadcrumbs(base, [{ name: tool.title, path: tool.path }]),
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden="true">/</span> <span>Tools</span> <span aria-hidden="true">/</span>{" "}
        <span aria-current="page">Tagline checker</span>
      </nav>

      <header className="mt-4 max-w-3xl space-y-4">
        <Badge variant="outline" className="bg-background px-3 py-1 text-xs">Free · No sign-up</Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{tool.title}</h1>
        <p className="text-pretty text-lg text-muted-foreground">
          Paste your tagline for a live 60-character count, a plain-English checklist and a preview of how it sits in the Product Hunt feed. No tagline yet? Paste your
          GitHub repo or live URL and get three options written from what your app actually does.
        </p>
      </header>

      <section aria-label="Tagline checker" className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-lg shadow-primary/5 sm:p-6">
        <TaglineChecker />
        <noscript>
          <p className="mt-4 text-sm text-muted-foreground">
            The live checker needs JavaScript. The rules below cover everything it checks: 60 characters at most, no trailing full stop, no all caps, no emoji, no vague
            hype and no repeated product name.
          </p>
        </noscript>
      </section>

      <div className={`mt-6 max-w-3xl ${prose}`}>
        <h2 id="rules">Rules that actually matter</h2>
        <ul>
          <li>
            <strong>60 characters, spaces included.</strong> That is the hard limit on Product Hunt&apos;s tagline field. There&apos;s no prize for using all 60: a short line
            people read in one glance beats a crammed one.
          </li>
          <li>
            <strong>Say what it does and who it&apos;s for.</strong> Your tagline sits under your name in a busy feed, and people decide in a second whether the product is for
            them. Describe the outcome, not the technology.
          </li>
          <li>
            <strong>Use a formula when you&apos;re stuck.</strong> <code>[Outcome] for [who]</code>, as in &ldquo;Launch kits for vibe-coded apps&rdquo;, or{" "}
            <code>[Action] without [pain]</code>, as in &ldquo;Ship release notes without writing them&rdquo;.
          </li>
          <li>
            <strong>&ldquo;AI-powered&rdquo; is weak differentiation.</strong> In 2026 a large share of launches are AI tools, so it tells people how you built it, not what
            it does for them. The same goes for &ldquo;revolutionary&rdquo;, &ldquo;ultimate&rdquo; and &ldquo;seamless&rdquo;. Name the job instead.
          </li>
          <li>
            <strong>Skip the noise.</strong> No trailing full stop, no ALL CAPS, no emoji, and don&apos;t repeat the product name: Product Hunt already shows it right above the
            tagline.
          </li>
        </ul>

        <h2 id="examples">Good vs weak taglines</h2>
        <p>Each weak tagline below fits the limit. It still loses to the stronger version next to it.</p>
      </div>
      <ul className="mt-5 grid max-w-3xl gap-3" data-testid="tagline-examples">
        {EXAMPLES.map((ex) => (
          <li key={ex.strong} className="rounded-xl border border-border bg-card p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="text-sm">
                <span className="block text-xs font-medium uppercase tracking-wide text-destructive">Weak</span>
                <span className="text-muted-foreground line-through decoration-destructive/40">{ex.weak}</span>
              </p>
              <p className="text-sm">
                <span className="block text-xs font-medium uppercase tracking-wide text-emerald-700">Stronger</span>
                <span className="font-medium">{ex.strong}</span>
              </p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{ex.why}</p>
          </li>
        ))}
      </ul>

      <div className={`max-w-3xl ${prose}`}>
        <h2 id="after-the-tagline">After the tagline</h2>
        <p>The tagline is one field of the listing. The rest of the launch post needs the same care:</p>
        <ul>
          <li><strong>Description: 260 characters maximum.</strong> The problem, what the product does about it, and one concrete detail only your product can claim.</li>
          <li><strong>Maker comment:</strong> the first comment, posted as soon as you go live. Why you built it, what it does today, what&apos;s next, and a specific question you want answered.</li>
          <li><strong>Gallery: 1270×760 images.</strong> Lead with the result, not your login screen, plus a 240×240 thumbnail that reads at small sizes.</li>
        </ul>
        <p>
          Work through the full <Link href="/product-hunt-launch-checklist">Product Hunt launch checklist</Link> for timing, images and launch-day steps. Built your app with
          Cursor, Lovable, Bolt or v0? Read <Link href="/how-to-launch-a-vibe-coded-app">how to launch a vibe-coded app</Link> too.
        </p>

        <h2 id="faq">Tagline FAQ</h2>
        <div className="space-y-8">
          {TAGLINE_FAQ.map((item) => (
            <section key={item.q}>
              <h3>{item.q}</h3>
              <p className="mt-2">{item.a}</p>
            </section>
          ))}
        </div>
      </div>

      <aside className="mt-16 flex flex-col items-start gap-4 rounded-3xl bg-foreground px-6 py-10 text-background sm:px-10">
        <h2 className="max-w-xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Tagline sorted. Now get the rest of your launch.</h2>
        <p className="max-w-xl text-background/75">
          Paste your repo and {SITE.name} drafts your Product Hunt description and maker comment, X thread, LinkedIn post and launch images, all inside each platform&apos;s
          limits. The preview is free; the full kit is £19.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/#start" className={buttonVariants({ size: "lg", className: "h-11 px-5 text-base" })}>Get my free preview</Link>
          <Link href="/pricing" className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 border-background/30 bg-transparent px-5 text-base text-background hover:bg-background/10 hover:text-background" })}>
            See pricing
          </Link>
        </div>
      </aside>
    </div>
  );
}
