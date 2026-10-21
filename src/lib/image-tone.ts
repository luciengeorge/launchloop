import { inflateSync } from "node:zlib";
import { luminance, parseColor } from "./ingest/colors";
import type { KitImageFormat } from "./schema";

/** How a logo reads against a background: whether the background shows through it, and how light its visible pixels are. */
export type ImageTone = { transparent: boolean; luminance: number };

const MAX_PIXELS = 2048 * 2048;
const SAMPLES = 64;

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

type DecodedPng = { width: number; height: number; rgba: (x: number, y: number) => [number, number, number, number] };

/**
 * Decodes an 8-bit, non-interlaced PNG (greyscale, RGB, palette, with or without alpha) far enough
 * to sample its pixels. Anything else (16-bit, interlaced, oversized, corrupt) returns undefined.
 */
function decodePng(bytes: Uint8Array): DecodedPng | undefined {
  try {
    const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.length < 33 || view.readUInt32BE(0) !== 0x89504e47) return undefined;
    let width = 0;
    let height = 0;
    let colorType = 0;
    let palette: Buffer | undefined;
    let trns: Buffer | undefined;
    const idat: Buffer[] = [];
    for (let i = 8; i + 8 <= view.length; ) {
      const length = view.readUInt32BE(i);
      const type = view.toString("latin1", i + 4, i + 8);
      const data = view.subarray(i + 8, i + 8 + length);
      if (type === "IHDR") {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        colorType = data[9];
        if (data[8] !== 8 || data[12] !== 0) return undefined;
      } else if (type === "PLTE") palette = data;
      else if (type === "tRNS") trns = data;
      else if (type === "IDAT") idat.push(data);
      else if (type === "IEND") break;
      i += 12 + length;
    }
    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
    if (!channels || !width || !height || width * height > MAX_PIXELS || (colorType === 3 && !palette)) return undefined;
    const stride = width * channels;
    const raw = inflateSync(Buffer.concat(idat), { maxOutputLength: (stride + 1) * height });
    if (raw.length < (stride + 1) * height) return undefined;

    const pixels = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
      const filter = raw[y * (stride + 1)];
      const src = y * (stride + 1) + 1;
      const row = y * stride;
      for (let x = 0; x < stride; x++) {
        const left = x >= channels ? pixels[row + x - channels] : 0;
        const up = y > 0 ? pixels[row - stride + x] : 0;
        const upLeft = y > 0 && x >= channels ? pixels[row - stride + x - channels] : 0;
        const v = raw[src + x];
        pixels[row + x] = (filter === 0 ? v : filter === 1 ? v + left : filter === 2 ? v + up : filter === 3 ? v + ((left + up) >> 1) : v + paeth(left, up, upLeft)) & 0xff;
      }
    }

    const rgba = (x: number, y: number): [number, number, number, number] => {
      const o = y * stride + x * channels;
      if (colorType === 0 || colorType === 4) return [pixels[o], pixels[o], pixels[o], colorType === 4 ? pixels[o + 1] : 255];
      if (colorType === 3) {
        const idx = pixels[o];
        return [palette![idx * 3], palette![idx * 3 + 1], palette![idx * 3 + 2], trns && idx < trns.length ? trns[idx] : 255];
      }
      return [pixels[o], pixels[o + 1], pixels[o + 2], colorType === 6 ? pixels[o + 3] : 255];
    };
    return { width, height, rgba };
  } catch {
    return undefined;
  }
}

/** A SAMPLES × SAMPLES grid of pixels spread evenly over the image. */
function* samples({ width, height, rgba }: DecodedPng) {
  for (let sy = 0; sy < SAMPLES; sy++) {
    for (let sx = 0; sx < SAMPLES; sx++) {
      yield rgba(Math.min(width - 1, Math.floor(((sx + 0.5) * width) / SAMPLES)), Math.min(height - 1, Math.floor(((sy + 0.5) * height) / SAMPLES)));
    }
  }
}

export function pngTone(bytes: Uint8Array): ImageTone | undefined {
  const png = decodePng(bytes);
  if (!png) return undefined;
  let clear = 0;
  let total = 0;
  let lum = 0;
  let weight = 0;
  for (const [r, g, b, a] of samples(png)) {
    total++;
    if (a < 128) clear++;
    else {
      lum += luminance([r, g, b]) * a;
      weight += a;
    }
  }
  return { transparent: clear / total > 0.02, luminance: weight ? lum / weight : 0 };
}

/** GitHub's default avatar: a 420px PNG of one colour on #F0F0F0, nothing to do with the project. */
export function isGitHubIdenticon(bytes: Uint8Array): boolean {
  const png = decodePng(bytes);
  if (!png || png.width !== 420 || png.height !== 420) return false;
  const colours = new Set<string>();
  for (const [r, g, b] of samples(png)) colours.add(`${r},${g},${b}`);
  return colours.size === 2 && colours.has("240,240,240");
}

/**
 * Reads an SVG's colours from its markup. A first shape that covers the whole view box is a
 * background, so the logo is opaque in that colour; otherwise it is transparent and as light as the
 * average of its fills (black when it declares none, as SVG does).
 */
export function svgTone(svg: string): ImageTone | undefined {
  const colours = [...svg.matchAll(/(?:fill|stroke|stop-color)\s*[=:]\s*["']?\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|white|black)/gi)].flatMap((m) => {
    const token = m[1].toLowerCase();
    const rgb = token === "white" ? ([255, 255, 255] as const) : token === "black" ? ([0, 0, 0] as const) : parseColor(token);
    return rgb ? [luminance([...rgb] as [number, number, number])] : [];
  });
  const box = svg.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  const first = svg.match(/<(rect|circle|path|polygon|ellipse|g)\b[^>]*>/i)?.[0] ?? "";
  if (box && first.startsWith("<rect")) {
    const num = (name: string) => {
      const v = first.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
      return v?.endsWith("%") ? (parseFloat(v) / 100) * Number(name === "width" ? box[1] : box[2]) : Number(v);
    };
    const fill = first.match(/fill\s*=\s*["']([^"']+)["']/i)?.[1];
    const rgb = fill ? parseColor(fill) : null;
    if (rgb && num("width") >= Number(box[1]) * 0.9 && num("height") >= Number(box[2]) * 0.9) return { transparent: false, luminance: luminance(rgb) };
  }
  return { transparent: true, luminance: colours.length ? colours.reduce((a, b) => a + b, 0) / colours.length : 0 };
}

export function imageTone(bytes: Uint8Array, format: KitImageFormat): ImageTone | undefined {
  switch (format) {
    case "png":
      return pngTone(bytes);
    case "svg":
      return svgTone(new TextDecoder().decode(bytes));
    case "jpeg":
      return { transparent: false, luminance: 0.5 };
    default: {
      const unreachable: never = format;
      return unreachable;
    }
  }
}
