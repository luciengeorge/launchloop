import { deflateSync } from "node:zlib";

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
};
/** A real RGBA PNG; `pixel` gives each pixel's colour. Rows use the Sub filter so unfiltering is exercised. */
export function png(width: number, height: number, pixel: (x: number, y: number) => [number, number, number, number] = () => [242, 84, 27, 255]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 1;
    let prev = [0, 0, 0, 0];
    for (let x = 0; x < width; x++) {
      const px = pixel(x, y);
      for (let c = 0; c < 4; c++) row[1 + x * 4 + c] = (px[c] - prev[c]) & 0xff;
      prev = px;
    }
    rows.push(row);
  }
  return new Uint8Array(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]));
}

/** A PNG header that claims any size: enough for the size probe. */
export function sizedPng(width: number, height: number) {
  const bytes = png(1, 1).slice(0, 33);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

/** A VP8X WebP header that claims any size. */
export function sizedWebp(width: number, height: number) {
  const b = Buffer.alloc(30);
  b.write("RIFF", 0);
  b.writeUInt32LE(22, 4);
  b.write("WEBPVP8X", 8);
  b.writeUInt32LE(10, 16);
  b.writeUIntLE(width - 1, 24, 3);
  b.writeUIntLE(height - 1, 27, 3);
  return new Uint8Array(b);
}

/** A GIF header that claims any size. */
export function sizedGif(width: number, height: number) {
  const b = Buffer.alloc(13);
  b.write("GIF89a", 0);
  b.writeUInt16LE(width, 6);
  b.writeUInt16LE(height, 8);
  return new Uint8Array(b);
}

export const bytesResponse = (bytes: Uint8Array, contentType = "image/png") => ({ url: "", status: 200, contentType, bytes, truncated: false, contentLength: bytes.byteLength });
