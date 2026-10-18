import "server-only";
import { parse, type HTMLElement } from "node-html-parser";
import { imageSize } from "./ingest/image-size";
import { normaliseInput } from "./ingest";
import { IngestError, safeFetch, safeFetchBytes } from "./ingest/safe-fetch";
import { cardFrom, checkOg, type OgCard, type OgImageInfo, type OgResult, type OgTags } from "./og-check";

export interface OgPreview extends OgResult {
  /** The page we read, after redirects. */
  url: string;
  host: string;
  tags: OgTags;
  image?: OgImageInfo;
  card: OgCard;
}

const IMAGE_READ_BYTES = 1_000_000;
const clean = (s: string | undefined) => s?.replace(/\s+/g, " ").trim() || undefined;

function meta(root: HTMLElement, key: string): string | undefined {
  const el = root.querySelector(`meta[property="${key}"]`) ?? root.querySelector(`meta[name="${key}"]`);
  return clean(el?.getAttribute("content"));
}

export function readTags(html: string): OgTags {
  const root = parse(html, { comment: false });
  const head = root.querySelector("head") ?? root;
  return {
    ogTitle: meta(head, "og:title"),
    ogDescription: meta(head, "og:description"),
    ogImage: meta(head, "og:image") ?? meta(head, "og:image:url") ?? meta(head, "og:image:secure_url"),
    ogImageAlt: meta(head, "og:image:alt"),
    ogImageWidth: meta(head, "og:image:width"),
    ogImageHeight: meta(head, "og:image:height"),
    ogUrl: meta(head, "og:url"),
    ogSiteName: meta(head, "og:site_name"),
    ogType: meta(head, "og:type"),
    twitterCard: meta(head, "twitter:card"),
    twitterTitle: meta(head, "twitter:title"),
    twitterDescription: meta(head, "twitter:description"),
    twitterImage: meta(head, "twitter:image") ?? meta(head, "twitter:image:src"),
    title: clean(head.querySelector("title")?.text),
    description: meta(head, "description"),
    canonical: clean(head.querySelector('link[rel="canonical"]')?.getAttribute("href")),
    themeColor: meta(head, "theme-color"),
  };
}

/** Fetches a live page and its share image (SSRF-guarded) and scores its Open Graph tags. */
export async function previewOg(rawUrl: string): Promise<OgPreview> {
  const input = normaliseInput(rawUrl);
  if (!/^https?:\/\//i.test(input)) throw new IngestError("Not a URL", "invalid_url", "Paste the full address of a live page, like https://your-app.com.");

  const page = await safeFetch(input, { maxBytes: 1_000_000 });
  if (page.status >= 400) throw new IngestError(`Page returned ${page.status}`, "site_http_error", `That page returned an error (HTTP ${page.status}).`);
  if (page.contentType && !/html|xml/i.test(page.contentType)) throw new IngestError(`Page is ${page.contentType}`, "site_not_html");

  const tags = readTags(page.text);
  const image = await readImage(tags, page.url);
  return { url: page.url, host: new URL(page.url).hostname.replace(/^www\./, ""), tags, image, card: cardFrom(tags, image), ...checkOg(tags, image) };
}

async function readImage(tags: OgTags, pageUrl: string): Promise<OgImageInfo | undefined> {
  const raw = tags.ogImage ?? tags.twitterImage;
  if (!raw) return undefined;
  const source = tags.ogImage ? "og:image" : "twitter:image";
  const relative = !/^https?:\/\//i.test(raw);
  let url: URL;
  try {
    url = new URL(raw, pageUrl);
  } catch {
    return { url: raw, source, relative, insecure: false, loaded: false, error: "it isn't a valid URL" };
  }
  const insecure = url.protocol === "http:" && new URL(pageUrl).protocol === "https:";
  const info: OgImageInfo = { url: url.toString(), source, relative, insecure, loaded: false };
  try {
    const res = await safeFetchBytes(info.url, { accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8", maxBytes: IMAGE_READ_BYTES, timeoutMs: 6000 });
    info.url = res.url;
    info.status = res.status;
    info.contentType = res.contentType || undefined;
    if (res.status >= 400) return { ...info, error: `it returned HTTP ${res.status}` };
    const size = imageSize(res.bytes, res.contentType);
    if (size.format === "unknown" && !/^image\//i.test(res.contentType)) return { ...info, error: "it isn't an image file" };
    return { ...info, ...size, loaded: true, bytes: res.contentLength ?? (res.truncated ? undefined : res.bytes.byteLength) };
  } catch (error) {
    if (error instanceof IngestError) return { ...info, error: imageError(error) };
    throw error;
  }
}

function imageError(error: IngestError): string {
  switch (error.code) {
    case "site_timeout":
      return "it took too long to respond";
    case "site_blocked":
      return "it isn't on a public address";
    case "invalid_url":
      return "only http and https image URLs work";
    case "site_http_error":
      return "it redirects too many times";
    case "site_unreachable":
    case "site_no_content":
    case "site_not_html":
    case "repo_not_found":
    case "repo_owner_not_found":
    case "github_rate_limited":
    case "github_unavailable":
    case "ai_busy":
    case "rate_limited":
    case "busy":
    case "unknown":
      return "we couldn't reach it";
    default: {
      const unreachable: never = error.code;
      return unreachable;
    }
  }
}
