import { SITE } from "@/lib/site";

const SHIP_LOOP_DESCRIPTION =
  "A subscription for after launch, coming soon. Every time you ship a release, Ship Loop drafts an X post, a LinkedIn post, a changelog blurb and an image in your colours, and emails them to you to approve or edit. It never posts for you.";

function shipLoopOffers(base: string) {
  return [
    {
      "@type": "Offer",
      name: "Ship Loop monthly",
      price: "12.00",
      priceCurrency: "GBP",
      url: `${base}/ship-loop`,
      availability: "https://schema.org/PreOrder",
      priceSpecification: { "@type": "UnitPriceSpecification", price: "12.00", priceCurrency: "GBP", billingDuration: "P1M", unitCode: "MON" },
    },
    {
      "@type": "Offer",
      name: "Ship Loop yearly",
      price: "99.00",
      priceCurrency: "GBP",
      url: `${base}/ship-loop`,
      availability: "https://schema.org/PreOrder",
      priceSpecification: { "@type": "UnitPriceSpecification", price: "99.00", priceCurrency: "GBP", billingDuration: "P1Y", unitCode: "ANN" },
    },
  ];
}

/** LaunchLoop itself, with every plan as an Offer. Shared by the home and pricing pages under one @id. */
export function launchLoopApp(base: string) {
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
      { "@type": "Offer", name: "Launch Kit (one-off)", price: "19.00", priceCurrency: "GBP", url: `${base}/pricing`, availability: "https://schema.org/InStock" },
      ...shipLoopOffers(base),
    ],
  };
}

/** Ship Loop as its own product, for the /ship-loop page. */
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
    offers: shipLoopOffers(base),
  };
}

/** Site-wide schema.org graph: Organization, WebSite and the SoftwareApplication with GBP offers. */
export function siteGraph(base: string) {
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
      launchLoopApp(base),
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
