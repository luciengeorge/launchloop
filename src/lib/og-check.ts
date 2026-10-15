import type { CheckStatus } from "./tagline-check";
import type { ImageFormat } from "./ingest/image-size";

/**
 * Open Graph rules for the free OG preview tool. Pure, so the server scores a
 * page with the same thresholds the tips section on the page explains.
 */
export const OG_IMAGE = { width: 1200, height: 630 } as const;
export const OG_RATIO = OG_IMAGE.width / OG_IMAGE.height;
export const OG_MIN = { width: 600, height: 315 } as const;
export const OG_TITLE_MAX = 70;
export const OG_DESCRIPTION_MAX = 200;
export const OG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const RATIO_TOLERANCE = 0.05;

export interface OgTags {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogImageWidth?: string;
  ogImageHeight?: string;
  ogUrl?: string;
  ogSiteName?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  title?: string;
  description?: string;
  canonical?: string;
  themeColor?: string;
}

export interface OgImageInfo {
  /** Absolute URL the image resolved to. */
  url: string;
  /** Which tag the image came from. */
  source: "og:image" | "twitter:image";
  /** The tag value wasn't an absolute http(s) URL. */
  relative: boolean;
  insecure: boolean;
  /** The image URL responded with a readable image. */
  loaded: boolean;
  status?: number;
  contentType?: string;
  format?: ImageFormat;
  width?: number;
  height?: number;
  bytes?: number;
  /** Why the image couldn't be read, for the checklist. */
  error?: string;
}

export type OgCheckId = "title" | "description" | "image" | "image-size" | "image-tags" | "twitter-card" | "url";

export interface OgCheck {
  id: OgCheckId;
  status: CheckStatus;
  label: string;
  detail: string;
}

export interface OgCard {
  title?: string;
  description?: string;
  siteName?: string;
  imageUrl?: string;
}

export interface OgResult {
  verdict: CheckStatus;
  checks: OgCheck[];
}

const SEVERITY: Record<CheckStatus, number> = { pass: 0, warn: 1, fail: 2 };
const worst = (statuses: CheckStatus[]): CheckStatus => statuses.reduce<CheckStatus>((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a), "pass");
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** What a link preview shows, with the fallbacks most apps use when a tag is missing. */
export function cardFrom(tags: OgTags, image?: OgImageInfo): OgCard {
  return {
    title: tags.ogTitle ?? tags.twitterTitle ?? tags.title,
    description: tags.ogDescription ?? tags.twitterDescription ?? tags.description,
    siteName: tags.ogSiteName,
    imageUrl: image?.loaded ? image.url : undefined,
  };
}

export function checkOg(tags: OgTags, image?: OgImageInfo): OgResult {
  const checks: OgCheck[] = [titleCheck(tags), descriptionCheck(tags), imageCheck(image)];
  if (image?.loaded) checks.push(imageSizeCheck(image));
  if (image) checks.push(imageTagsCheck(tags, image));
  checks.push(twitterCheck(tags), urlCheck(tags));
  return { verdict: worst(checks.map((c) => c.status)), checks };
}

function titleCheck(tags: OgTags): OgCheck {
  const label = "Title";
  const title = tags.ogTitle ?? tags.title;
  if (!title) return { id: "title", status: "fail", label, detail: "No og:title and no <title>. Apps fall back to the bare URL, which nobody clicks." };
  if (!tags.ogTitle) {
    return { id: "title", status: "warn", label, detail: "No og:title, so apps fall back to your <title>. Add og:title so you control exactly what the card says." };
  }
  if (title.length > OG_TITLE_MAX) {
    return { id: "title", status: "warn", label, detail: `og:title is ${title.length} characters. X, LinkedIn and Slack cut titles off around 60–70, so lead with the words that matter.` };
  }
  return { id: "title", status: "pass", label, detail: `og:title is set (${title.length} characters).` };
}

function descriptionCheck(tags: OgTags): OgCheck {
  const label = "Description";
  if (!tags.ogDescription && !tags.description) {
    return { id: "description", status: "warn", label, detail: "No og:description or meta description, so the card shows a title and nothing else. One plain sentence is enough." };
  }
  if (!tags.ogDescription) {
    return { id: "description", status: "warn", label, detail: "No og:description. Some apps use your meta description instead, others show nothing. Set og:description too." };
  }
  if (tags.ogDescription.length > OG_DESCRIPTION_MAX) {
    return {
      id: "description",
      status: "warn",
      label,
      detail: `og:description is ${tags.ogDescription.length} characters. Most cards show one or two lines, so keep it under about 155 and put the point first.`,
    };
  }
  return { id: "description", status: "pass", label, detail: `og:description is set (${tags.ogDescription.length} characters).` };
}

function imageCheck(image: OgImageInfo | undefined): OgCheck {
  const label = "Share image";
  if (!image) return { id: "image", status: "fail", label, detail: "No og:image. Links share as a plain text card with no picture, which gets far fewer clicks." };
  if (!image.loaded) return { id: "image", status: "fail", label, detail: `The ${image.source} URL didn't load: ${image.error ?? "unknown error"}.` };
  const notes: string[] = [];
  if (image.source === "twitter:image") notes.push("Only twitter:image is set; Facebook, LinkedIn, Slack and iMessage read og:image.");
  if (image.relative) notes.push("The URL is relative. Use the full https:// address; many crawlers ignore relative image URLs.");
  if (image.insecure) notes.push("The image is served over http. Use https so every app will load it.");
  if (notes.length) return { id: "image", status: "warn", label, detail: notes.join(" ") };
  return { id: "image", status: "pass", label, detail: "og:image is set and loads." };
}

function imageSizeCheck(image: OgImageInfo): OgCheck {
  const label = `Image size (${OG_IMAGE.width}×${OG_IMAGE.height})`;
  const { width, height, format } = image;
  const statuses: CheckStatus[] = [];
  const notes: string[] = [];

  if (format === "svg") {
    statuses.push("fail");
    notes.push("It's an SVG, which Facebook, X and LinkedIn don't show. Export a PNG or JPG.");
  } else if (!width || !height) {
    statuses.push("warn");
    notes.push(`We couldn't read the size of this ${format && format !== "unknown" ? format.toUpperCase() : "file"}. PNG or JPG at ${OG_IMAGE.width}×${OG_IMAGE.height} is the safe choice.`);
  } else {
    const ratio = width / height;
    const off = Math.abs(ratio - OG_RATIO) / OG_RATIO;
    if (width < OG_MIN.width || height < OG_MIN.height) {
      statuses.push("fail");
      notes.push(`It's ${width}×${height}, below ${OG_MIN.width}×${OG_MIN.height}, so most apps show it as a small thumbnail or not at all. Use ${OG_IMAGE.width}×${OG_IMAGE.height}.`);
    } else if (off > RATIO_TOLERANCE) {
      statuses.push("warn");
      const shape = ratio < OG_RATIO ? "too tall, so the top and bottom get cropped" : "too wide, so the sides get cropped";
      notes.push(`It's ${width}×${height} (${ratio.toFixed(2)}:1). Cards are 1.91:1, and this is ${shape}. The preview shows the crop.`);
    } else if (width < OG_IMAGE.width) {
      statuses.push("warn");
      notes.push(`Right shape, but ${width}×${height} looks soft on high-density screens. Export at ${OG_IMAGE.width}×${OG_IMAGE.height}.`);
    } else {
      statuses.push("pass");
      notes.push(width === OG_IMAGE.width && height === OG_IMAGE.height ? `Exactly ${OG_IMAGE.width}×${OG_IMAGE.height}.` : `${width}×${height}: the right shape and sharp enough.`);
    }
  }
  if (image.bytes && image.bytes > OG_IMAGE_MAX_BYTES) {
    statuses.push("warn");
    notes.push(`The file is ${mb(image.bytes)}. X skips images over 5 MB and big files slow every crawler down; aim for under 1 MB.`);
  }
  return { id: "image-size", status: worst(statuses), label, detail: notes.join(" ") };
}

function imageTagsCheck(tags: OgTags, image: OgImageInfo): OgCheck {
  const label = "Image width, height and alt tags";
  const notes: string[] = [];
  const declaredW = Number(tags.ogImageWidth);
  const declaredH = Number(tags.ogImageHeight);
  if (!tags.ogImageWidth || !tags.ogImageHeight) {
    notes.push("Add og:image:width and og:image:height so Facebook and LinkedIn can show the image on the very first share.");
  } else if (image.width && image.height && (declaredW !== image.width || declaredH !== image.height)) {
    notes.push(`The tags say ${tags.ogImageWidth}×${tags.ogImageHeight} but the file is ${image.width}×${image.height}. Make them match.`);
  }
  if (!tags.ogImageAlt) notes.push("Add og:image:alt describing the image, for people using screen readers.");
  if (notes.length) return { id: "image-tags", status: "warn", label, detail: notes.join(" ") };
  return { id: "image-tags", status: "pass", label, detail: "Width, height and alt text are all declared." };
}

function twitterCheck(tags: OgTags): OgCheck {
  const label = "X (Twitter) card";
  switch (tags.twitterCard) {
    case "summary_large_image":
      return { id: "twitter-card", status: "pass", label, detail: "twitter:card is summary_large_image, so X shows the full-width image." };
    case undefined:
      return { id: "twitter-card", status: "warn", label, detail: "No twitter:card. Add twitter:card = summary_large_image, or X may show a small thumbnail instead of the full image." };
    default:
      return {
        id: "twitter-card",
        status: "warn",
        label,
        detail: `twitter:card is "${tags.twitterCard}", which shows a small square thumbnail on X. Use summary_large_image for the full-width card.`,
      };
  }
}

function urlCheck(tags: OgTags): OgCheck {
  const label = "Canonical URL";
  if (tags.ogUrl) return { id: "url", status: "pass", label, detail: "og:url is set, so shares of the same page count as one link." };
  if (tags.canonical) return { id: "url", status: "warn", label, detail: "There's a canonical link but no og:url. Add og:url with the same address." };
  return { id: "url", status: "warn", label, detail: "No og:url or canonical link. Add one so shares with ?ref= or tracking links still point at one page." };
}
