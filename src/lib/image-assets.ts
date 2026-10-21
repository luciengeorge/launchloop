import "server-only";
import { imageTone, type ImageTone } from "./image-tone";
import { imageSize } from "./ingest/image-size";
import { safeFetchBytes } from "./ingest/safe-fetch";
import { fits, IMAGE_ACCEPT, kitImageFormat, MAX_LOGO_BYTES, MAX_SCREENSHOT_BYTES } from "./ingest/visuals";
import type { KitImageFormat, KitImageRef, KitVisuals } from "./schema";

/** An image ready to embed: a data URI, so Satori never fetches anything itself. */
export type LoadedImage = { src: string; width: number; height: number; format: KitImageFormat; tone?: ImageTone };
export type KitImageAssets = {
  screenshot?: LoadedImage;
  logo?: LoadedImage;
  /** A screenshot or logo the kit has could not be loaded this time, so the image fell back. */
  degraded: boolean;
};

export const ASSET_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 10 * 60 * 1000;
/** Entries are base64 data URIs of up to ~4 MB each, so the cache stays small. */
const CACHE_MAX = 12;

const MIME: Record<KitImageFormat, string> = { png: "image/png", jpeg: "image/jpeg", svg: "image/svg+xml" };

/** Three variants of one kit render at once; the cache lets them share one download per image. */
const cache = new Map<string, { at: number; value: Promise<LoadedImage | null> }>();

async function fetchImage(ref: KitImageRef, kind: "screenshot" | "logo"): Promise<LoadedImage | null> {
  try {
    const res = await safeFetchBytes(ref.url, {
      accept: IMAGE_ACCEPT[kind],
      maxBytes: kind === "screenshot" ? MAX_SCREENSHOT_BYTES : MAX_LOGO_BYTES,
      timeoutMs: ASSET_TIMEOUT_MS,
    });
    if (res.status >= 400 || res.truncated) return null;
    const size = imageSize(res.bytes, res.contentType);
    const format = kitImageFormat(kind, size.format, res.contentType);
    if (!format || !size.width || !size.height) return null;
    if (!fits(kind, format, size.width, size.height)) return null;
    const src = `data:${MIME[format]};base64,${Buffer.from(res.bytes).toString("base64")}`;
    return { src, width: size.width, height: size.height, format, tone: kind === "logo" ? imageTone(res.bytes, format) : undefined };
  } catch {
    return null;
  }
}

function loadImage(ref: KitImageRef, kind: "screenshot" | "logo"): Promise<LoadedImage | null> {
  const key = `${kind}:${ref.url}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value = fetchImage(ref, kind);
  cache.set(key, { at: Date.now(), value });
  // A failure isn't cached, so the next render tries again.
  void value.then((v) => {
    if (!v && cache.get(key)?.value === value) cache.delete(key);
  });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return value;
}

/** Fetches the kit's screenshot and logo (SSRF-guarded, size-capped, time-boxed). Anything that fails is simply left out. */
export async function loadKitImageAssets(visuals: KitVisuals | undefined): Promise<KitImageAssets> {
  const [screenshot, logo] = await Promise.all([
    visuals?.screenshot ? loadImage(visuals.screenshot, "screenshot") : null,
    visuals?.logo ? loadImage(visuals.logo, "logo") : null,
  ]);
  return {
    ...(screenshot && { screenshot }),
    ...(logo && { logo }),
    degraded: (!!visuals?.screenshot && !screenshot) || (!!visuals?.logo && !logo),
  };
}
