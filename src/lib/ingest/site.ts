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
  prices: string[];
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

  root.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());
  const body = root.querySelector("body") ?? root;
  const text = (sel: string, max: number) => unique(body.querySelectorAll(sel).map((el) => clean(el.text)), max);

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
    listItems: text("li", 16).filter((li) => li.length < 140),
    prices: unique(page.text.match(/[£$€]\s?\d+(?:\.\d{2})?(?:\s?\/\s?(?:mo|month|yr|year))?/gi) ?? [], 4),
    themeColor: meta(root, "theme-color"),
    githubUrl,
    css: [inlineCss, ...sheets].join("\n").slice(0, 900_000),
  };
}
