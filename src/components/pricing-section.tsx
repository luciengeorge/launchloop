import { Check } from "lucide-react";
import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";
import { StartLink } from "@/components/start-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export function PricingSection({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  return (
      <section id="pricing" className="border-y border-border/60 bg-muted/40" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Heading id="pricing-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple pricing
          </Heading>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <PriceCard
              name="Free preview"
              price="£0"
              body="See what LaunchLoop makes of your app before you pay."
              items={["Product brief from your repo", "Product Hunt tagline", "First post of your X thread", "Watermarked OG image"]}
              cta={<StartLink className={buttonVariants({ variant: "outline", className: "w-full" })}>Try it free</StartLink>}
            />
            <PriceCard
              featured
              name="Launch Kit"
              price="£19"
              suffix="one-off"
              body="Your whole launch, ready to paste."
              items={["Landing page copy and meta tags", "Full Product Hunt post and maker comment", "5–7 post X thread and LinkedIn post", "3 on-brand images, no watermark", "Launch-day checklist", "ZIP download and email copy"]}
              cta={<StartLink plan="kit" className={buttonVariants({ className: "w-full" })}>Get my launch kit</StartLink>}
            />
            <PriceCard
              name="Ship Loop"
              price="£12"
              suffix="/month or £99/year"
              body="Coming soon: fresh posts and an image every time you release."
              items={["Watches your repo for releases", "Drafts update posts and an OG image", "One-click approve or edit by email", "£19 kit credit if you join within 14 days"]}
              cta={
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <CheckoutButton product="shiploop_monthly" variant="outline" className="w-full">
                      £12 monthly
                    </CheckoutButton>
                    <CheckoutButton product="shiploop_yearly" className="w-full">
                      £99 yearly
                    </CheckoutButton>
                  </div>
                  <Link href="/ship-loop" className="block text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    Or join the free waitlist
                  </Link>
                </div>
              }
            />
          </div>
        </div>
      </section>
  );
}

function PriceCard(props: { name: string; price: string; suffix?: string; body: string; items: string[]; cta: React.ReactNode; featured?: boolean }) {
  return (
    <article className={`flex flex-col rounded-2xl border bg-background p-6 ${props.featured ? "border-primary shadow-xl shadow-primary/10" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{props.name}</h3>
        {props.featured ? <Badge>Most popular</Badge> : null}
      </div>
      <p className="mt-4">
        <span className="text-4xl font-semibold tracking-tight">{props.price}</span>
        {props.suffix ? <span className="ml-1 text-sm text-muted-foreground">{props.suffix}</span> : null}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{props.body}</p>
      <ul className="mt-6 flex-1 space-y-2 text-sm">
        {props.items.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-6">{props.cta}</div>
    </article>
  );
}
