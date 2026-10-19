import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { StartLink } from "@/components/start-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FREE_PREVIEW, PREVIEW_LIMITS } from "@/lib/site";
import { KitPrice, KitPromoNote } from "./kit-price";

const KIT_ITEMS = [
  "Landing page copy and meta tags",
  "Full Product Hunt post and maker comment",
  "5 to 7 post X thread",
  "LinkedIn post",
  "3 images in your colours, no watermark",
  "Launch-day checklist",
  "ZIP download and a copy by email",
  "Full refund within 14 days, for any reason",
];

const SHIP_LOOP_ITEMS = [
  "Watches your public repo for releases, tags and changelog updates",
  "Drafts an X post, LinkedIn post and changelog blurb",
  "A fresh image in your colours for each one",
  "Emailed to you to approve or edit. We never post for you",
  "Free waitlist: we'll email you when it launches",
];

export function PricingTimeline({ promo, className = "" }: { promo: boolean; className?: string }) {
  const timeline = [
    { step: "Try it", product: "Free preview" },
    {
      step: "Launch it",
      product: (
        <>
          Launch Kit, <KitPrice promo={promo} /> once
        </>
      ),
    },
    { step: "Keep shipping", product: "Ship Loop (coming soon, free waitlist)" },
  ];
  return (
    <ol aria-label="How the plans fit together" className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-sm ${className}`}>
      {timeline.map((item, i) => (
        <li key={item.step} className="flex items-center gap-3">
          {i > 0 ? <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
          <span>
            <span className="font-medium">{item.step}</span>
            <span className="text-muted-foreground">: {item.product}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** One text node, so the card and its served HTML both read "Waitlist, free to join" (two spans read "Waitlistfree to join"). */
const shipLoopLabel = <span className="text-2xl font-semibold tracking-tight">Waitlist, free to join</span>;

const freeCta = <StartLink className={buttonVariants({ variant: "outline", className: "w-full" })}>Get my free preview</StartLink>;
const kitCta = (promo: boolean) => (
  <StartLink plan="kit" className={buttonVariants({ className: "w-full" })}>
    Get my launch kit, <KitPrice promo={promo} />
  </StartLink>
);

/**
 * The home page's three-step strip, or the full comparison on /pricing.
 * `promo` is isLaunchPromoOn(): the exp_launch14_promo price on the Launch Kit.
 */
export function PricingSection({ variant = "home", promo }: { variant?: "home" | "page"; promo: boolean }) {
  return (
    <section id="pricing" className="border-y border-border/60 bg-muted/40" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">{variant === "home" ? <HomeStrip promo={promo} /> : <PricingPage promo={promo} />}</div>
    </section>
  );
}

function HomeStrip({ promo }: { promo: boolean }) {
  return (
    <>
      <h2 id="pricing-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Three steps. Pay only for what you need.
      </h2>
      <PricingTimeline promo={promo} className="mt-4" />
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <PriceCard
          name="1. Free preview"
          price="£0"
          body="Try it on your repo. You get a product brief, your Product Hunt tagline, the first post of your X thread and three watermarked images."
          cta={freeCta}
        />
        <PriceCard
          featured
          badge="Most people start here"
          name="2. Launch Kit"
          price={<KitPrice promo={promo} size="display" />}
          suffix="once"
          note={<KitPromoNote promo={promo} className="mt-2" />}
          body="Everything for launch day, for one app. Landing copy, full Product Hunt post, X thread, LinkedIn post, 3 images with no watermark, and a checklist. ZIP download and email copy. Not a subscription."
          cta={kitCta(promo)}
        />
        <PriceCard
          badge="Coming soon"
          name="3. Ship Loop"
          price={shipLoopLabel}
          body="For after launch. Every time you release, we draft an X post, a LinkedIn post, a changelog blurb and an image, and email them to you to approve. Join the waitlist, we'll email you when it launches."
          cta={
            <Link href="/ship-loop" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Join the free waitlist
            </Link>
          }
        />
      </div>
    </>
  );
}

function PricingPage({ promo }: { promo: boolean }) {
  return (
    <>
      <h1 id="pricing-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
        LaunchLoop pricing
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Try it free. Pay <KitPrice promo={promo} /> once to launch. Ship Loop is for after launch.
      </p>
      <KitPromoNote promo={promo} className="mt-3 inline-block" />
      <PricingTimeline promo={promo} className="mt-4" />
      <div className="mt-10 grid gap-4 lg:grid-cols-3 lg:gap-6">
        <PriceCard
          heading="h2"
          name="Free preview"
          price="£0"
          body="See a taste of your launch before you pay."
          items={[...FREE_PREVIEW, `Public repos only. ${PREVIEW_LIMITS.perHour} per hour, ${PREVIEW_LIMITS.perDay} per day.`]}
          cta={freeCta}
        />
        <PriceCard
          heading="h2"
          featured
          badge="Most people start here"
          name="Launch Kit"
          price={<KitPrice promo={promo} size="display" />}
          suffix="once"
          note={<KitPromoNote promo={promo} className="mt-2" />}
          body="Everything for launch day. One app, one payment, no subscription."
          items={KIT_ITEMS}
          cta={kitCta(promo)}
        />
        <div className="flex flex-col gap-3 lg:border-l lg:border-dashed lg:border-border lg:pl-6" data-testid="ship-loop-plan">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">After launch</p>
          <PriceCard
            heading="h2"
            muted
            badge="Coming soon"
            name="Ship Loop"
            price={shipLoopLabel}
            body="Ship Loop is coming soon and isn't on sale. A draft post and image for every release."
            items={SHIP_LOOP_ITEMS}
            cta={
              <Link href="/ship-loop#plans" className={buttonVariants({ variant: "outline", className: "w-full" })}>
                Join the waitlist
              </Link>
            }
          />
        </div>
      </div>
    </>
  );
}

function PriceCard({ heading: Heading = "h3", ...props }: {
  heading?: "h2" | "h3";
  name: string;
  price: React.ReactNode;
  suffix?: string;
  note?: React.ReactNode;
  body: string;
  items?: readonly string[];
  cta: React.ReactNode;
  badge?: string;
  featured?: boolean;
  muted?: boolean;
}) {
  const tone = props.featured ? "border-primary bg-background shadow-xl shadow-primary/10" : props.muted ? "border-dashed border-border bg-background/60" : "border-border bg-background";
  return (
    <article className={`flex flex-1 flex-col rounded-2xl border p-6 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <Heading className="font-medium">{props.name}</Heading>
        {props.badge ? <Badge variant={props.featured ? "default" : "outline"}>{props.badge}</Badge> : null}
      </div>
      <p className="mt-4">
        {typeof props.price === "string" ? <span className="text-4xl font-semibold tracking-tight">{props.price}</span> : props.price}
        {props.suffix ? <span className="ml-1 text-sm text-muted-foreground">{props.suffix}</span> : null}
      </p>
      {props.note}
      <p className={`mt-2 text-sm text-muted-foreground ${props.items ? "" : "flex-1"}`}>{props.body}</p>
      {props.items ? (
        <ul className="mt-6 flex-1 space-y-2 text-sm">
          {props.items.map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6">{props.cta}</div>
    </article>
  );
}
