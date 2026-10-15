import { SITE } from "@/lib/site";

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
      {
        "@type": "SoftwareApplication",
        "@id": `${base}/#app`,
        name: SITE.name,
        url: `${base}/`,
        image: `${base}/opengraph-image`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: SITE.description,
        publisher: { "@id": org },
        offers: [
          { "@type": "Offer", name: "Free preview", price: "0", priceCurrency: "GBP", url: `${base}/#start`, availability: "https://schema.org/InStock" },
          { "@type": "Offer", name: "Launch Kit (one-off)", price: "19.00", priceCurrency: "GBP", url: `${base}/pricing`, availability: "https://schema.org/InStock" },
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
        ],
      },
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
