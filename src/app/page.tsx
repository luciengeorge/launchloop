import { Check, FileText, GitBranch, Globe, Image as ImageIcon, ListChecks, Megaphone, MessageSquareText, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HeroHeadline, HeroHeadlinePending } from "@/components/hero-headline";
import { JsonLd } from "@/components/json-ld";
import { KitForm } from "@/components/kit-form";
import { KitPrice, KitPromoNote, PricedText } from "@/components/kit-price";
import { PricingSection } from "@/components/pricing-section";
import { StartLink } from "@/components/start-link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { siteUrl } from "@/lib/env";
import { heroExperimentEnabled, heroHeadlineAssignment } from "@/lib/hero-headline-server";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { siteGraph } from "@/lib/structured-data";
import { FAQ, KIT_CONTENTS } from "@/lib/site";
import { OG_PREVIEW, TAGLINE_CHECKER } from "@/lib/tools";

export const metadata: Metadata = pageMetadata(PAGES.home);

const KIT_ICONS = [Globe, Megaphone, MessageSquareText, FileText, ImageIcon, ListChecks];

const STEPS = [
  { title: "Paste a link", body: "A public GitHub repo or your live URL. We read the README, package.json, the last 20 commit messages and your landing page." },
  { title: "Get your brief", body: "A short product brief built from what's actually in your README, package.json and commits: real features, real numbers, your stack." },
  { title: "Launch from it", body: "Copy for every platform plus three images in your brand colours, checked against each platform's limits." },
];

const RULES = [
  { title: "Reads your README and commits, not just your homepage", body: "Features and numbers come from your README, package.json (or other manifest files) and recent commits, so the copy says something only your app can say." },
  { title: "Every limit, enforced", body: "60-character PH taglines, 260-character descriptions, 280-character posts counted the way X counts them." },
  { title: "Never asks for upvotes", body: "Asking for upvotes or coordinating votes gets you penalised on Product Hunt and Hacker News, and HN also bans asking for comments. We strip those out and just invite people to check out your launch." },
  { title: "Images in your colours", body: "We pull your palette from your site's CSS and render OG, X and Product Hunt images at the exact sizes." },
];

export default async function Home() {
  const url = siteUrl();
  const promo = await isLaunchPromoOn();
  return (
    <>
      <JsonLd data={siteGraph(url)} />

      <section id="start" className="relative scroll-mt-20 overflow-hidden border-b border-border/60">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
          <Badge variant="outline" className="mb-6 bg-background/80 px-3 py-1 text-xs">
            For apps built with Cursor, Lovable, Bolt and v0
          </Badge>
          {heroExperimentEnabled() ? (
            <Suspense fallback={<HeroHeadlinePending />}>
              <AssignedHeroHeadline />
            </Suspense>
          ) : (
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Paste your repo. <span className="text-primary">Get your whole launch.</span>
            </h1>
          )}
          <p className="mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
            LaunchLoop reads your repo&apos;s README, package.json and recent commits, plus your live site, then writes your landing page copy, Product Hunt
            post, X thread and LinkedIn post, plus three images in your brand colours.
          </p>
          <div className="mt-10 flex w-full justify-center">
            <KitForm promo={promo} />
          </div>
          <p className="mt-8 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Free preview, no account needed. Full kit is <KitPrice promo={promo} />, paid once, for one app.
            </span>
          </p>
          <KitPromoNote promo={promo} className="mt-2" />
          <Link href="/pricing" className="mt-2 text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary">
            See what&apos;s in the <KitPrice promo={promo} /> kit
          </Link>
          <p className="mt-6 text-sm text-muted-foreground">
            Only need one piece?{" "}
            <Link href={TAGLINE_CHECKER.path} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
              Try the free tagline checker
            </Link>{" "}
            or{" "}
            <Link href={OG_PREVIEW.path} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
              preview your link card
            </Link>
          </p>
        </div>
      </section>

      <section id="kit" className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="kit-heading">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">The Launch Kit</p>
          <h2 id="kit-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything in the <KitPrice promo={promo} /> Launch Kit
          </h2>
          <p className="mt-3 text-muted-foreground">
            One payment, one app, everything for launch day. Other tools write copy, or make images, or schedule posts. The kit does the whole launch from one link.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KIT_CONTENTS.map((item, i) => {
            const Icon = KIT_ICONS[i];
            return (
              <article key={item.title} className="rounded-2xl border border-border bg-card p-6">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 font-medium">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/40" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="how-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative rounded-2xl border border-border bg-background p-6">
                <span className="font-mono text-sm text-primary">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="size-4" aria-hidden="true" /> Public repos only. We never clone your code. We keep a short excerpt of your sources with your kit, nothing more.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="why-heading">
        <h2 id="why-heading" className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Launch copy that doesn&apos;t read like everyone else&apos;s
        </h2>
        <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
          {RULES.map((rule) => (
            <div key={rule.title} className="flex gap-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h3 className="font-medium">{rule.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{rule.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <PricingSection promo={promo} />

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-3xl font-semibold tracking-tight">
          Questions
        </h2>
        <Accordion className="mt-6">
          {FAQ.slice(0, 5).map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="text-base">
                <PricedText text={item.q} promo={promo} />
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <PricedText text={item.a} promo={promo} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Link href="/faq" className="mt-6 inline-block text-sm font-medium underline underline-offset-4 hover:text-primary">
          Read all FAQs
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="flex flex-col items-center gap-5 rounded-3xl bg-foreground px-6 py-14 text-center text-background">
          <h2 className="max-w-xl text-balance text-3xl font-semibold tracking-tight">Your app is built. Let&apos;s get it launched.</h2>
          <StartLink className={buttonVariants({ size: "lg", className: "h-11 px-6 text-base" })}>Get my free preview</StartLink>
        </div>
      </section>
    </>
  );
}

/** With HERO_EXPERIMENT=1, the only per-request part of the page: everything else stays in the static shell. */
async function AssignedHeroHeadline() {
  return <HeroHeadline served={await heroHeadlineAssignment()} />;
}
