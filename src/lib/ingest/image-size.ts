export type ImageFormat = "png" | "jpeg" | "gif" | "webp" | "svg" | "avif" | "unknown";

export interface ImageSize {
  format: ImageFormat;
  width?: number;
  height?: number;
}

const ascii = (b: Uint8Array, start: number, end: number) => String.fromCharCode(...b.subarray(start, end));
const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);

/** Reads pixel dimensions from the first bytes of an image file, without decoding it. */
export function imageSize(bytes: Uint8Array, contentType = ""): ImageSize {
  const b = bytes;
  if (b.length >= 24 && b[0] === 0x89 && ascii(b, 1, 4) === "PNG" && ascii(b, 12, 16) === "IHDR") {
    return { format: "png", width: u32be(b, 16), height: u32be(b, 20) };
  }
  if (b.length >= 10 && (ascii(b, 0, 6) === "GIF87a" || ascii(b, 0, 6) === "GIF89a")) {
    return { format: "gif", width: u16le(b, 6), height: u16le(b, 8) };
  }
  if (b.length >= 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return { format: "webp", ...webpSize(b) };
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) return { format: "jpeg", ...jpegSize(b) };
  if (b.length >= 12 && ascii(b, 4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(b, 8, 12))) return { format: "avif" };
  const head = new TextDecoder().decode(b.subarray(0, 512)).trimStart().toLowerCase();
  if (/svg/i.test(contentType) || head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    return { format: "svg", ...svgSize(new TextDecoder().decode(b.subarray(0, 8192))) };
  }
  return { format: "unknown" };
}

const svgLength = (value: string | undefined) => {
  const m = value?.trim().match(/^(\d+(?:\.\d+)?)(px)?$/);
  return m ? Number(m[1]) : undefined;
};

/** From the root element's width/height (plain or px lengths), else its viewBox. */
export function svgSize(text: string): { width?: number; height?: number } {
  const tag = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!tag) return {};
  const attr = (name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
  const width = svgLength(attr("width"));
  const height = svgLength(attr("height"));
  if (width && height) return { width, height };
  const box = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (box?.length === 4 && box[2] > 0 && box[3] > 0) return { width: box[2], height: box[3] };
  return {};
}

function webpSize(b: Uint8Array): { width?: number; height?: number } {
  switch (ascii(b, 12, 16)) {
    case "VP8 ":
      return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    case "VP8L":
      return { width: 1 + (((b[22] & 0x3f) << 8) | b[21]), height: 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)) };
    case "VP8X":
      return { width: 1 + u24le(b, 24), height: 1 + u24le(b, 27) };
    default:
      return {};
  }
}

function jpegSize(b: Uint8Array): { width?: number; height?: number } {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return {};
    const marker = b[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // Start-of-frame markers carry the size; C4 (DHT), C8 (JPG) and CC (DAC) share the range but don't.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: u16be(b, i + 5), width: u16be(b, i + 7) };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    i += 2 + u16be(b, i + 2);
  }
  return {};
}
