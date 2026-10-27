import "server-only";
import { parse, type HTMLElement } from "node-html-parser";
import { pricesIn } from "../prices";
import { githubRepoLink } from "./github";
import { IngestError, safeFetch } from "./safe-fetch";
import { spacedText } from "./text";

export interface SiteData {
  url: string;
  title?: string;
  description?: string;
  siteName?: string;
  h1?: string;
  headings: string[];
  paragraphs: string[];
  listItems: string[];
  /** Only from a real pricing section or the site's own pricing page. */
  prices: string[];
  /** Same-site pricing page linked from the page, if any. */
  pricingUrl?: string;
  themeColor?: string;
  githubUrl?: string;
  css: string;
  /** Absolute og:image (or twitter:image) URL. */
  ogImage?: string;
  /** Absolute icon URLs, best logo candidate first. */
  icons?: string[];
}

const clean = (s: string | undefined) => s?.replace(/\s+/g, " ").trim() || undefined;
const unique = (items: (string | undefined)[], max: number) =>
  [...new Set(items.filter((s): s is string => !!s && s.length > 2))].slice(0, max);

function meta(root: HTMLElement, key: string): string | undefined {
  const el = root.querySelector(`meta[property="${key}"]`) ?? root.querySelector(`meta[name="${key}"]`);
  return clean(el?.getAttribute("content"));
}

export async function fetchSite(url: string, warnings: string[]): Promise<SiteData> {
  const page = await safeFetch(url);
  if (page.status >= 400) throw new IngestError(`Live page returned ${page.status}`, "site_http_error", `That page returned an error (HTTP ${page.status}).`);
  if (page.contentType && !/html|xml|text\/plain/i.test(page.contentType)) {
    throw new IngestError(`Live page is ${page.contentType}`, "site_not_html");
  }
  const root = parse(page.text, { comment: false });

  const inlineCss = [
    ...root.querySelectorAll("style").map((s) => s.text),
    ...root.querySelectorAll("[style]").map((el) => el.getAttribute("style") ?? ""),
  ].join("\n");

  const stylesheetHrefs = root
    .querySelectorAll('link[rel~="stylesheet"]')
    .map((l) => l.getAttribute("href"))
    .filter((h): h is string => !!h)
    .slice(0, 3);

  const sheets = await Promise.all(
    stylesheetHrefs.map(async (href) => {
      try {
        const res = await safeFetch(new URL(href, page.url).toString(), { accept: "text/css,*/*", maxBytes: 600_000, timeoutMs: 6000 });
        return res.status < 400 ? res.text : "";
      } catch {
        return "";
      }
    }),
  );

  // Pricing and repo links usually live in the nav or footer, so find them before stripping those.
  const pricingUrl = findPricingLink(root, page.url);
  const githubUrl = root
    .querySelectorAll("a[href]")
    .map((a) => githubRepoLink(a.getAttribute("href") ?? ""))
    .find((href) => href !== undefined);
  const images = pageImages(root, page.url);
  root.querySelectorAll("script, style, noscript, svg, nav, header, footer, [role=navigation]").forEach((el) => el.remove());
  const body = root.querySelector("body") ?? root;
  const text = (sel: string, max: number) => unique(body.querySelectorAll(sel).map((el) => clean(el.text)), max);

  const prices = await extractPrices(body, page.url, pricingUrl);

  const paragraphs = text("p", 12).filter((p) => p.length > 30);
  if (paragraphs.length === 0 && !clean(body.text)) {
    warnings.push("The live page renders almost everything with JavaScript, so we leaned on the repo and meta tags instead.");
  }

  return {
    url: page.url,
    title: clean(root.querySelector("title")?.text),
    description: meta(root, "description") ?? meta(root, "og:description"),
    siteName: meta(root, "og:site_name") ?? meta(root, "og:title"),
    h1: text("h1", 1)[0],
    headings: text("h2, h3", 10),
    paragraphs,
    listItems: text("li", 24).filter((li) => li.length < 140 && li.split(/\s+/).length >= 3 && !/^["“'‘]/.test(li)).slice(0, 16),
    prices,
    pricingUrl,
    themeColor: meta(root, "theme-color"),
    githubUrl,
    css: [inlineCss, ...sheets].join("\n").slice(0, 900_000),
    ...images,
  };
}

const absolute = (href: string | undefined, base: string) => {
  if (!href) return undefined;
  try {
    const url = new URL(href.trim(), base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The page's share image and its icons as logo candidates: apple-touch-icons first (opaque by
 * convention, so they read on any background), then SVG icons, then PNG icons of 64px or more.
 * ICO files are skipped because the image renderer can't draw them.
 */
export function pageImages(root: HTMLElement, pageUrl: string): Pick<SiteData, "ogImage" | "icons"> {
  const ogImage = absolute(meta(root, "og:image") ?? meta(root, "og:image:url") ?? meta(root, "twitter:image") ?? meta(root, "twitter:image:src"), pageUrl);
  const ranked: { url: string; rank: number }[] = [];
  for (const link of root.querySelectorAll("link[rel][href]")) {
    const rel = (link.getAttribute("rel") ?? "").toLowerCase().split(/\s+/);
    const url = absolute(link.getAttribute("href"), pageUrl);
    if (!url || /\.ico(\?|#|$)/i.test(url)) continue;
    const type = (link.getAttribute("type") ?? "").toLowerCase();
    const size = Math.max(0, ...(link.getAttribute("sizes") ?? "").split(/\s+/).map((s) => Number(s.split("x")[0]) || 0));
    const svg = type.includes("svg") || /\.svg(\?|#|$)/i.test(url);
    if (rel.includes("apple-touch-icon") || rel.includes("apple-touch-icon-precomposed")) ranked.push({ url, rank: 1000 - Math.min(size || 180, 999) });
    else if (rel.includes("icon") && svg) ranked.push({ url, rank: 2000 });
    else if (rel.includes("icon") && (size === 0 || size >= 64)) ranked.push({ url, rank: 3000 - Math.min(size, 999) });
  }
  const icons = [...new Set(ranked.sort((a, b) => a.rank - b.rank).map((r) => r.url))].slice(0, 4);
  return { ogImage, icons };
}

const PRICING_WORD = /^(pricing|plans|prices)$/i;

/** A same-site link to /pricing (or /plans), the signal that the product actually charges. */
export function findPricingLink(root: HTMLElement, pageUrl: string): string | undefined {
  const base = new URL(pageUrl);
  for (const a of root.querySelectorAll("a[href]")) {
    try {
      const href = new URL(a.getAttribute("href") ?? "", base);
      if (href.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
      if (/^\/(pricing|plans)\/?$/i.test(href.pathname)) {
        href.hash = "";
        return href.toString();
      }
    } catch {
      // Ignore malformed hrefs.
    }
  }
  return undefined;
}

/** Elements that are explicitly a pricing section: id="pricing", or a section whose heading is "Pricing"/"Plans". */
export function pricingSections(body: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (const el of body.querySelectorAll("section, div, main, article")) {
    const id = el.getAttribute("id") ?? "";
    const heading = el.querySelector("h1, h2, h3");
    const headingIsPricing = el.tagName === "SECTION" && heading && PRICING_WORD.test(clean(heading.text)?.replace(/[^\w ]/g, "") ?? "");
    if (PRICING_WORD.test(id) || headingIsPricing) found.push(el);
  }
  return found;
}

async function extractPrices(body: HTMLElement, pageUrl: string, pricingUrl: string | undefined): Promise<string[]> {
  const fromSection = pricesIn(pricingSections(body).map(spacedText).join(" "));
  if (fromSection.length) return fromSection;
  if (!pricingUrl || pricingUrl === pageUrl) return [];
  try {
    const res = await safeFetch(pricingUrl, { timeoutMs: 6000 });
    if (res.status >= 400) return [];
    const root = parse(res.text, { comment: false });
    root.querySelectorAll("script, style, noscript, svg, nav, header, footer, [role=navigation]").forEach((el) => el.remove());
    return pricesIn(spacedText(root.querySelector("main") ?? root.querySelector("body") ?? root));
  } catch {
    return [];
  }
}
