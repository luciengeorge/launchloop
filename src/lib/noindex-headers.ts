/**
 * Social image routes, which Google otherwise lists as "Crawled - currently not indexed". Shared by next.config.ts
 * (headers) and tests. Pure: no imports.
 *
 * robots.txt must keep allowing these paths: X/LinkedIn/Slack crawlers skip disallowed og:image URLs, and Google has to
 * fetch a URL to see its X-Robots-Tag.
 */
export const NOINDEX_IMAGE_SOURCES = [
  "/og/:path*",
  // The opengraph-image and twitter-image file conventions at any depth, including generateImageMetadata ids
  // (/x/opengraph-image/1) and static image files (/x/opengraph-image.png).
  "/:path*/:image((?:opengraph|twitter)-image(?:\\.(?:png|jpe?g|gif))?)/:id*",
];

export const NOINDEX_HEADER = { key: "X-Robots-Tag", value: "noindex" };
