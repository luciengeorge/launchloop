import type { Metadata } from "next";
import { KitPrice } from "@/components/kit-price";
import { isLaunchPromoOn } from "@/lib/launch-promo-server";
import { PAGES } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { PREVIEW_LIMITS, SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata(PAGES.terms);

const mail = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>;

export default async function TermsPage() {
  const promo = await isLaunchPromoOn();
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-16 leading-relaxed sm:px-6 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:text-muted-foreground [&_p]:text-muted-foreground [&_strong]:text-foreground">
      <h1 className="text-4xl font-semibold tracking-tight">Terms of service</h1>
      <p>
        Last updated 19 October 2026. These terms are between you and Lucien George, a sole trader trading as LaunchLoop (&quot;we&quot; or &quot;us&quot;). Contact: {mail}.
      </p>

      <h2>What LaunchLoop does</h2>
      <p>
        LaunchLoop writes draft launch copy and images from public information about your app. Everything it makes is a draft. You review it, edit it and post it yourself. We
        never post for you.
      </p>
      <p>AI writes the drafts and it can get things wrong. Check facts, numbers and claims before you post. You&apos;re responsible for what you publish.</p>
      <p>LaunchLoop isn&apos;t affiliated with Product Hunt, X, LinkedIn or GitHub.</p>

      <h2>Free preview</h2>
      <p>
        The free preview shows a product brief, a Product Hunt tagline, the first post of your X thread and three watermarked images. It&apos;s for trying LaunchLoop before you
        buy. The full copy and the images without a watermark come with the Launch Kit. The preview works with public repos and live sites only, and is limited to{" "}
        {PREVIEW_LIMITS.perHour} previews an hour and {PREVIEW_LIMITS.perDay} a day.
      </p>

      <h2>Launch Kit</h2>
      <p>
        The Launch Kit is a one-off payment of <KitPrice promo={promo} /> for one app. It&apos;s not a subscription. Prices are as shown on the site and at checkout. You get the full kit on its page, as
        a ZIP download and by email, and you sign in with a link we email you.
      </p>
      <p>One kit covers one app. For another app, buy another kit.</p>

      <h2>Refunds</h2>
      <p>
        If you&apos;re not happy for any reason, email {mail} or reply to your kit email within 14 days of buying and we&apos;ll refund you in full, even though your kit has
        already been delivered.
      </p>
      <p>This doesn&apos;t affect your legal rights, for example if a kit is faulty or not as described.</p>

      <h2>Ship Loop (coming soon)</h2>
      <p>
        Ship Loop isn&apos;t on sale and we don&apos;t take payment for it. You can join the free waitlist, and we&apos;ll email you if and when it launches. Joining
        doesn&apos;t commit you to anything. If Ship Loop ever goes on sale, its terms will be published here first.
      </p>
      <p>
        Ship Loop only makes drafts. It emails them to you to approve or edit. Approving a draft doesn&apos;t publish it anywhere: you post it yourself. It never posts for you.
      </p>

      <h2>Your content</h2>
      <p>
        Only submit repos and sites you own or have permission to promote. You let us read and process them to make your preview and kit. You keep all rights to the copy and
        images we make for you.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use LaunchLoop to make misleading claims, spam, or anything that breaks a platform&apos;s rules. Don&apos;t try to get round the free preview limits. If you
        do, we may refuse your order, refund it and close your access.
      </p>

      <h2>Payment disputes</h2>
      <p>
        If something&apos;s wrong with a payment, please email us first. We&apos;ll usually sort it faster than a chargeback. If a chargeback is opened, we may pause access to the
        kit until it&apos;s resolved.
      </p>

      <h2>Liability</h2>
      <p>
        We work hard to make LaunchLoop useful, but we can&apos;t promise any result. We&apos;re not responsible for how a launch performs, or for decisions made by Product Hunt,
        X, LinkedIn or any other platform.
      </p>
      <p>
        If we are responsible for a loss, our total liability is limited to what you paid us in the 12 months before. Nothing in these terms limits liability that can&apos;t
        legally be limited, or your rights as a consumer.
      </p>

      <h2>Changes and law</h2>
      <p>
        We may update these terms. If a change matters, we&apos;ll email customers before it takes effect. These terms are governed by the laws of England and Wales. If you live
        elsewhere in the UK, you keep any rights your local law gives you.
      </p>
    </article>
  );
}
