import { Download, Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IMAGE_VARIANTS, type ImageVariant } from "@/lib/image-variants";
import { LIMITS } from "@/lib/limits";
import type { Kit } from "@/lib/schema";
import { AssetBlock } from "./asset-block";

const maskEmail = (email: string) => email.replace(/^(.)(.*)(@.*)$/, (_, a: string, b: string, c: string) => `${a}${"•".repeat(Math.min(b.length, 6))}${c}`);

export function FullKit({ kit }: { kit: Kit & { content: NonNullable<Kit["content"]> } }) {
  const c = kit.content;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your launch kit is ready</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="size-4" aria-hidden="true" />
            {kit.email ? `A copy with the ZIP is going to ${maskEmail(kit.email)}. Bookmark this page too: it's your private link.` : "Bookmark this page: it's your private link."}
          </p>
        </div>
        <a href={`/api/kits/${kit.id}/zip`} className={buttonVariants({ size: "lg", className: "h-10 px-4" })} download>
          <Download aria-hidden="true" />
          Download ZIP
        </a>
      </div>

      <Tabs defaultValue="ph">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
          <TabsTrigger value="ph">Product Hunt</TabsTrigger>
          <TabsTrigger value="x">X thread</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          <TabsTrigger value="landing">Landing page</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="ph" className="mt-4 space-y-4">
          <AssetBlock label="Name" text={c.productHunt.name} limit={LIMITS.phName} />
          <AssetBlock label="Tagline" text={c.productHunt.tagline} limit={LIMITS.phTagline} />
          <AssetBlock label="Description" text={c.productHunt.description} limit={LIMITS.phDescription} />
          <AssetBlock label="Topics" text={c.productHunt.topics.join(", ")} />
          <AssetBlock
            label="Maker comment"
            text={c.productHunt.makerComment}
            limit={LIMITS.phMakerComment}
            hint="Post this as the first comment the moment you go live. It asks for feedback, not votes: Product Hunt bans vote requests."
          />
        </TabsContent>

        <TabsContent value="x" className="mt-4 space-y-4" data-testid="x-thread">
          {c.xThread.map((post, i) => (
            <AssetBlock key={i} label={`Post ${i + 1} of ${c.xThread.length}`} text={post} limit={LIMITS.xPost} measure="x" />
          ))}
        </TabsContent>

        <TabsContent value="linkedin" className="mt-4">
          <AssetBlock label="LinkedIn post" text={c.linkedin} limit={LIMITS.linkedin} />
        </TabsContent>

        <TabsContent value="landing" className="mt-4 space-y-4">
          <AssetBlock label="Headline" text={c.landing.headline} limit={LIMITS.landingHeadline} />
          <AssetBlock label="Subheadline" text={c.landing.subheadline} limit={LIMITS.landingSubheadline} />
          <AssetBlock label="Call to action" text={c.landing.cta} limit={LIMITS.landingCta} />
          <div className="grid gap-4 md:grid-cols-2">
            {c.landing.features.map((f, i) => (
              <AssetBlock key={i} label={`Feature ${i + 1}: ${f.title}`} text={`${f.title}\n${f.description}`} />
            ))}
          </div>
          <AssetBlock label="Meta title" text={c.landing.metaTitle} limit={LIMITS.metaTitle} />
          <AssetBlock label="Meta description" text={c.landing.metaDescription} limit={LIMITS.metaDescription} />
        </TabsContent>

        <TabsContent value="images" className="mt-4 grid gap-6 md:grid-cols-2">
          {(Object.keys(IMAGE_VARIANTS) as ImageVariant[]).map((v) => {
            const meta = IMAGE_VARIANTS[v];
            const src = `/api/og/${kit.id}/${v}`;
            return (
              <figure key={v} className="overflow-hidden rounded-xl border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic PNG from our own route */}
                <img src={src} alt={`${meta.label} for ${kit.brief.name}`} width={meta.width} height={meta.height} className="h-auto w-full" loading="lazy" />
                <figcaption className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs text-muted-foreground">
                  {meta.label}
                  <a href={src} download={meta.file} className="font-medium text-foreground underline underline-offset-4">
                    Download
                  </a>
                </figcaption>
              </figure>
            );
          })}
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <ol className="space-y-3 rounded-xl border border-border bg-card p-5">
            {(kit.checklist ?? []).map((item, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-primary">{String(i + 1).padStart(2, "0")}</span>
                {item}
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>
    </div>
  );
}
