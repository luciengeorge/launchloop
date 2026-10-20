/**
 * Text measurement and fitting for the kit images (Satori via @vercel/og). Satori does its own line
 * breaking, so the images render the lines computed here, one nowrap row each: the layout we budget
 * is the layout that gets drawn.
 */

/** Advance widths (per-mille of an em) for ASCII 32..126 in Geist Regular, the @vercel/og default font. */
const ASCII_WIDTHS = [
  250, 213, 346, 478, 629, 802, 620, 178, 274, 274, 430, 558, 201, 419, 201, 480, 663, 384, 619, 613, 615, 626, 593, 524, 604, 593, 297, 297,
  544, 540, 544, 559, 906, 668, 680, 703, 694, 603, 590, 700, 713, 270, 597, 640, 580, 877, 743, 739, 650, 733, 672, 640, 552, 689, 667, 945,
  606, 576, 544, 347, 455, 347, 426, 557, 248, 551, 595, 546, 595, 561, 395, 594, 581, 244, 260, 590, 267, 877, 581, 573, 595, 595, 379, 520,
  392, 575, 536, 819, 585, 537, 537, 389, 264, 389, 523,
];
/** Over-estimate a little so a computed line never comes out wider than its box when drawn. */
const SAFETY = 1.06;
export const ELLIPSIS = "…";

function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 32 && code < 127) return ASCII_WIDTHS[code - 32] / 1000;
  if (code === 0x2026) return 0.571;
  // CJK and other wide scripts come from fallback fonts at roughly a full em.
  return code >= 0x2e80 ? 1 : 0.65;
}

export function textWidth(text: string, fontSize: number, letterSpacing = 0): number {
  let w = 0;
  for (const ch of text) w += charWidth(ch) * fontSize + letterSpacing;
  return w * SAFETY;
}

/** Greedy word wrap; a single word wider than the box is broken between characters. */
export function wrapText(text: string, fontSize: number, maxWidth: number, letterSpacing = 0): string[] {
  const fits = (s: string) => textWidth(s, fontSize, letterSpacing) <= maxWidth;
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    let rest = word;
    while (!fits(rest)) {
      const chars = [...rest];
      let n = 1;
      while (n < chars.length && fits(chars.slice(0, n + 1).join(""))) n++;
      lines.push(chars.slice(0, n).join(""));
      rest = chars.slice(n).join("");
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines;
}

/** Keeps the first `maxLines` lines, ending the last one at a word boundary with an ellipsis. */
function clampLines(lines: string[], maxLines: number, fontSize: number, maxWidth: number, letterSpacing: number): string[] {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  const fits = (s: string) => textWidth(`${s}${ELLIPSIS}`, fontSize, letterSpacing) <= maxWidth;
  while (last && !fits(last)) {
    const cut = last.lastIndexOf(" ");
    last = cut > 0 ? last.slice(0, cut) : [...last].slice(0, -1).join("");
  }
  kept[maxLines - 1] = `${last.replace(/[\s,;:.\-–—]+$/u, "")}${ELLIPSIS}`;
  return kept;
}

export type FittedText = {
  fontSize: number;
  /** Multiplier of fontSize, as passed in. */
  lineHeight: number;
  letterSpacing: number;
  lines: string[];
  /** Estimated width of the widest line. */
  width: number;
  height: number;
  truncated: boolean;
};

export type FitOptions = {
  /** Candidate font sizes, largest first. */
  sizes: readonly number[];
  maxWidth: number;
  maxLines: number;
  lineHeight: number;
  maxHeight?: number;
  letterSpacing?: number;
};

/**
 * Picks the largest size at which the text wraps within `maxLines` (and `maxHeight`). If none
 * does, uses the smallest size and truncates at a word boundary with an ellipsis.
 */
export function fitText(text: string, opts: FitOptions): FittedText {
  const { sizes, maxWidth, maxLines, lineHeight, maxHeight, letterSpacing = 0 } = opts;
  if (sizes.length === 0) throw new Error("fitText needs at least one font size");
  const allowedLines = (size: number) =>
    Math.max(1, Math.min(maxLines, maxHeight === undefined ? maxLines : Math.floor(maxHeight / (size * lineHeight) + 1e-6)));
  const result = (fontSize: number, lines: string[], truncated: boolean): FittedText => ({
    fontSize,
    lineHeight,
    letterSpacing,
    lines,
    width: Math.max(0, ...lines.map((l) => textWidth(l, fontSize, letterSpacing))),
    height: lines.length * fontSize * lineHeight,
    truncated,
  });

  for (const size of sizes) {
    const lines = wrapText(text, size, maxWidth, letterSpacing);
    if (lines.length <= allowedLines(size)) return result(size, lines, false);
  }
  const size = sizes[sizes.length - 1];
  const lines = wrapText(text, size, maxWidth, letterSpacing);
  return result(size, clampLines(lines, allowedLines(size), size, maxWidth, letterSpacing), true);
}
