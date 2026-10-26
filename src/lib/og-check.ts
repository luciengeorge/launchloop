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
/** X's archived card docs: "Images must be less than 5MB in size." LinkedIn: "Max file size: 5 MB". Read as decimal megabytes. */
export const OG_IMAGE_MAX_BYTES = 5_000_000;
/** Facebook and LinkedIn ask for 1.91:1 and X's archived docs describe 2:1, so anything from 1200×630 to 2:1 is the right shape. */
export const OG_RATIO_RANGE = { min: OG_RATIO, max: 2 } as const;
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
  /** An http image on an https page, which browsers and some apps refuse to load. */
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
const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

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
  if (!title) return { id: "title", status: "fail", label, detail: "No og:title and no <title>, so the card has no title of yours to show. Add og:title." };
  if (!tags.ogTitle) {
    return { id: "title", status: "warn", label, detail: "No og:title, only a <title>. Add og:title so you control exactly what the card says." };
  }
  if (title.length > OG_TITLE_MAX) {
    return { id: "title", status: "warn", label, detail: `og:title is ${title.length} characters. X's archived card docs give a card title a maximum of ${OG_TITLE_MAX} characters ("max 70 characters"), so lead with the words that matter.` };
  }
  return { id: "title", status: "pass", label, detail: `og:title is set (${title.length} characters).` };
}

function descriptionCheck(tags: OgTags): OgCheck {
  const label = "Description";
  if (!tags.ogDescription && !tags.description) {
    return { id: "description", status: "warn", label, detail: `No og:description or meta description. Add og:description: the Open Graph protocol suggests "A one to two sentence description of your object."` };
  }
  if (!tags.ogDescription) {
    return { id: "description", status: "warn", label, detail: `No og:description, only a meta description. The Open Graph protocol lists og:description among the properties that are "generally recommended", so set it too.` };
  }
  if (tags.ogDescription.length > OG_DESCRIPTION_MAX) {
    return {
      id: "description",
      status: "warn",
      label,
      detail: `og:description is ${tags.ogDescription.length} characters. X's archived card docs give a card description a maximum of ${OG_DESCRIPTION_MAX} characters ("maximum 200 characters"), so put the point first.`,
    };
  }
  return { id: "description", status: "pass", label, detail: `og:description is set (${tags.ogDescription.length} characters).` };
}

function imageCheck(image: OgImageInfo | undefined): OgCheck {
  const label = "Share image";
  if (!image) return { id: "image", status: "fail", label, detail: `No og:image, so there's no share image for apps to show. Add a ${OG_IMAGE.width}×${OG_IMAGE.height} PNG or JPG.` };
  if (!image.loaded) return { id: "image", status: "fail", label, detail: `The ${image.source} URL didn't load: ${image.error ?? "unknown error"}.` };
  const notes: string[] = [];
  if (image.source === "twitter:image") notes.push("Only twitter:image is set. Add og:image too: it is the tag Facebook's and LinkedIn's sharing docs ask for.");
  if (image.relative) notes.push("The URL is relative. Use the full https:// address, which is the form every Open Graph protocol example uses.");
  if (image.insecure) notes.push("The page is https but the image is http. Serve the image over https too.");
  if (notes.length) return { id: "image", status: "warn", label, detail: notes.join(" ") };
  return { id: "image", status: "pass", label, detail: "og:image is set and loads." };
}

function imageSizeCheck(image: OgImageInfo): OgCheck {
  const label = `Image size (${OG_IMAGE.width}×${OG_IMAGE.height})`;
  const { width, height, format } = image;
  const statuses: CheckStatus[] = [];
  const notes: string[] = [];

  if (format === "svg") {
    statuses.push("warn");
    notes.push("It's an SVG, and some platforms don't accept SVG: X's archived card docs say it isn't supported. Export a PNG or JPG.");
  } else if (!width || !height) {
    statuses.push("warn");
    notes.push(`We couldn't read the size of this ${format && format !== "unknown" ? format.toUpperCase() : "file"}. PNG or JPG at ${OG_IMAGE.width}×${OG_IMAGE.height} is the safe choice.`);
  } else {
    const ratio = width / height;
    const tooTall = ratio < OG_RATIO_RANGE.min * (1 - RATIO_TOLERANCE);
    const tooWide = ratio > OG_RATIO_RANGE.max * (1 + RATIO_TOLERANCE);
    if (width < OG_MIN.width || height < OG_MIN.height) {
      statuses.push("fail");
      notes.push(`It's ${width}×${height}, below ${OG_MIN.width}×${OG_MIN.height}. Facebook says a smaller image "will still display in the link page post, but the size will be much smaller." Use ${OG_IMAGE.width}×${OG_IMAGE.height}.`);
    } else if (tooTall || tooWide) {
      statuses.push("warn");
      const shape = tooTall ? "too tall, so the top and bottom may be cropped" : "too wide, so the sides may be cropped";
      notes.push(`It's ${width}×${height} (${ratio.toFixed(2)}:1). Facebook and LinkedIn ask for 1.91:1 and X's archived docs describe 2:1, and this is ${shape}. The preview shows a 1.91:1 crop.`);
    } else if (width < OG_IMAGE.width) {
      statuses.push("warn");
      notes.push(`Right shape, but ${width}×${height} is under the 1200 x 630 that Facebook recommends "for the best display on high resolution devices". Export at ${OG_IMAGE.width}×${OG_IMAGE.height}.`);
    } else {
      statuses.push("pass");
      notes.push(width === OG_IMAGE.width && height === OG_IMAGE.height ? `Exactly ${OG_IMAGE.width}×${OG_IMAGE.height}.` : `${width}×${height}: between 1.91:1 and 2:1, and at least ${OG_IMAGE.width} wide.`);
    }
  }
  if (image.bytes && image.bytes >= OG_IMAGE_MAX_BYTES) {
    statuses.push("warn");
    notes.push(`The file is ${mb(image.bytes)}. X's archived docs say images must be less than 5MB, and LinkedIn's limit is 5 MB; aim for under 1 MB.`);
  }
  return { id: "image-size", status: worst(statuses), label, detail: notes.join(" ") };
}

function imageTagsCheck(tags: OgTags, image: OgImageInfo): OgCheck {
  const label = "Image width, height and alt tags";
  const notes: string[] = [];
  const declaredW = Number(tags.ogImageWidth);
  const declaredH = Number(tags.ogImageHeight);
  if (!tags.ogImageWidth || !tags.ogImageHeight) {
    notes.push("Add og:image:width and og:image:height so Facebook can show the image on the very first share.");
  } else if (image.width && image.height && (declaredW !== image.width || declaredH !== image.height)) {
    notes.push(`The tags say ${tags.ogImageWidth}×${tags.ogImageHeight} but the file is ${image.width}×${image.height}. Make them match.`);
  }
  if (!tags.ogImageAlt) notes.push(`Add og:image:alt describing what is in the image. X's archived docs describe image alt text as being for "users who are visually impaired".`);
  if (notes.length) return { id: "image-tags", status: "warn", label, detail: notes.join(" ") };
  return { id: "image-tags", status: "pass", label, detail: "Width, height and alt text are all declared." };
}

function twitterCheck(tags: OgTags): OgCheck {
  const label = "X (Twitter) card";
  switch (tags.twitterCard) {
    case "summary_large_image":
      return { id: "twitter-card", status: "pass", label, detail: `twitter:card is summary_large_image, the card X's archived docs describe with "a large, full-width prominent image".` };
    case undefined:
      return { id: "twitter-card", status: "warn", label, detail: `No twitter:card. X's archived docs say that without it "a summary card may be rendered", so add twitter:card = summary_large_image.` };
    default:
      return {
        id: "twitter-card",
        status: "warn",
        label,
        detail: `twitter:card is "${tags.twitterCard}". For the large image card, X's archived docs say twitter:card "Must be set to a value of “summary_large_image”".`,
      };
  }
}

function urlCheck(tags: OgTags): OgCheck {
  const label = "Canonical URL";
  if (tags.ogUrl) return { id: "url", status: "pass", label, detail: `og:url is set. Facebook says "Likes and Shares for this URL will aggregate at this URL."` };
  if (tags.canonical) return { id: "url", status: "warn", label, detail: "There's a canonical link but no og:url. Add og:url with the same address." };
  return { id: "url", status: "warn", label, detail: `No og:url or canonical link. Add og:url: Facebook says it "should be the undecorated URL, without session variables, user identifying parameters, or counters."` };
}
