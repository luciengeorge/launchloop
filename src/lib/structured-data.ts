import { chargedPence } from "@/lib/products";
import { SITE } from "@/lib/site";

const SHIP_LOOP_DESCRIPTION =
  "Coming soon, with a free waitlist. Every time you ship a release, Ship Loop drafts an X post, a LinkedIn post, a changelog blurb and an image in your colours, and emails them to you to approve or edit. It never posts for you.";

/** "19.00" from 1900 pence. */
export const offerPrice = (pence: number) => (pence / 100).toFixed(2);

/**
 * LaunchLoop itself, with what's on sale as Offers. Shared by the home and pricing pages under one @id.
 * `promo` is isLaunchPromoOn(): the kit Offer is what Checkout charges, the same price the page shows.
 */
export function launchLoopApp(base: string, promo: boolean) {
  return {
    "@type": "SoftwareApplication",
    "@id": `${base}/#app`,
    name: SITE.name,
    url: `${base}/`,
    image: `${base}/opengraph-image`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: SITE.description,
    publisher: { "@id": `${base}/#organization` },
    offers: [
      { "@type": "Offer", name: "Free preview", price: "0", priceCurrency: "GBP", url: `${base}/#start`, availability: "https://schema.org/InStock" },
      { "@type": "Offer", name: "Launch Kit (one-off)", price: offerPrice(chargedPence("kit", promo)), priceCurrency: "GBP", url: `${base}/pricing`, availability: "https://schema.org/InStock" },
    ],
  };
}

/** Ship Loop as its own product, for the /ship-loop page. No offers: it's a free waitlist, not on sale. */
export function shipLoopApp(base: string) {
  return {
    "@type": "SoftwareApplication",
    "@id": `${base}/ship-loop#app`,
    name: "Ship Loop",
    url: `${base}/ship-loop`,
    image: `${base}/og/ship-loop`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: SHIP_LOOP_DESCRIPTION,
    publisher: { "@id": `${base}/#organization` },
    isRelatedTo: { "@id": `${base}/#app` },
  };
}

/** Site-wide schema.org graph: Organization, WebSite and the SoftwareApplication with GBP offers. */
export function siteGraph(base: string, promo: boolean) {
  const org = `${base}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: SITE.name,
        url: `${base}/`,
        logo: { "@type": "ImageObject", url: `${base}/icons/icon-512.png`, width: 512, height: 512 },
        email: SITE.email,
        sameAs: [`https://x.com/${SITE.twitter.replace("@", "")}`],
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: SITE.name,
        url: `${base}/`,
        description: SITE.description,
        inLanguage: "en-GB",
        publisher: { "@id": org },
      },
      launchLoopApp(base, promo),
    ],
  };
}

export function breadcrumbs(base: string, items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${base}${item.path}`,
    })),
  };
}

export function faqPage(id: string, items: readonly { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    "@id": id,
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };
}

/** A hub page listing other pages, as a CollectionPage whose main entity is an ordered ItemList. */
export function collectionPage(base: string, page: { path: string; name: string; description: string }, items: { name: string; path: string }[]) {
  const url = `${base}${page.path}`;
  return {
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    url,
    name: page.name,
    description: page.description,
    inLanguage: "en-GB",
    isPartOf: { "@id": `${base}/#website` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, url: `${base}${item.path}` })),
    },
  };
}
