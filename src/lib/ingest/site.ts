import "server-only";
import { parse, type HTMLElement } from "node-html-parser";
import { safeFetch } from "./safe-fetch";

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
  if (page.status >= 400) throw new Error(`Live page returned ${page.status}`);
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

  // Pricing links usually live in the nav, so find them before stripping it.
  const pricingUrl = findPricingLink(root, page.url);
  root.querySelectorAll("script, style, noscript, svg, nav, header, footer, [role=navigation]").forEach((el) => el.remove());
  const body = root.querySelector("body") ?? root;
  const text = (sel: string, max: number) => unique(body.querySelectorAll(sel).map((el) => clean(el.text)), max);

  const prices = await extractPrices(body, page.url, pricingUrl);

  const githubUrl = root
    .querySelectorAll("a[href]")
    .map((a) => a.getAttribute("href") ?? "")
    .find((href) => /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i.test(href));

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
  };
}

const PRICE_RE = /[£$€]\s?\d+(?:\.\d{2})?(?:\s?\/\s?(?:mo|month|yr|year))?/gi;
const PRICING_WORD = /^(pricing|plans|prices)$/i;
const matchPrices = (text: string) => unique(text.match(PRICE_RE) ?? [], 4);

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
  const fromSection = matchPrices(pricingSections(body).map((el) => el.text).join(" "));
  if (fromSection.length) return fromSection;
  if (!pricingUrl || pricingUrl === pageUrl) return [];
  try {
    const res = await safeFetch(pricingUrl, { timeoutMs: 6000 });
    if (res.status >= 400) return [];
    const root = parse(res.text, { comment: false });
    root.querySelectorAll("script, style, noscript, svg, nav, header, footer, [role=navigation]").forEach((el) => el.remove());
    return matchPrices((root.querySelector("main") ?? root.querySelector("body") ?? root).text);
  } catch {
    return [];
  }
}
