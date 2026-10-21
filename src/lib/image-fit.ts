/**
 * Text measurement and fitting for the kit images (Satori via @vercel/og). Satori does its own line
 * breaking, so the images render the lines computed here, one nowrap row each: the layout we budget
 * is the layout that gets drawn.
 */

export type FontWeight = 400 | 600 | 700;

/** Advance widths (per-mille of an em) for ASCII 32..126 in the Geist weights the kit images bundle (assets/fonts). */
const ASCII_WIDTHS: Record<FontWeight, number[]> = {
  400: [
    250, 213, 346, 478, 629, 802, 620, 178, 274, 274, 430, 558, 201, 419, 201, 480, 663, 384, 619, 613, 615, 626, 593, 524, 604, 593, 297, 297,
    544, 540, 544, 559, 906, 668, 680, 703, 694, 603, 590, 700, 713, 270, 597, 640, 580, 877, 743, 739, 650, 733, 672, 640, 552, 689, 667, 945,
    606, 576, 544, 347, 455, 347, 426, 557, 248, 551, 595, 546, 595, 561, 395, 594, 581, 244, 260, 590, 267, 877, 581, 573, 595, 595, 379, 520,
    392, 575, 536, 819, 585, 537, 537, 389, 264, 389, 523,
  ],
  600: [
    236, 243, 376, 552, 656, 818, 677, 195, 306, 306, 424, 566, 225, 418, 225, 508, 683, 427, 642, 637, 643, 656, 615, 538, 644, 618, 306, 306,
    548, 548, 548, 581, 944, 709, 695, 724, 708, 615, 600, 726, 719, 290, 617, 672, 586, 902, 748, 763, 664, 757, 689, 668, 584, 699, 709, 991,
    660, 613, 577, 375, 485, 375, 450, 560, 268, 580, 621, 580, 621, 591, 429, 620, 601, 269, 308, 628, 297, 892, 601, 603, 621, 621, 409, 553,
    427, 597, 584, 839, 628, 570, 567, 401, 284, 401, 523,
  ],
  700: [
    228, 257, 390, 589, 670, 825, 706, 203, 323, 323, 422, 570, 236, 417, 236, 522, 693, 449, 653, 650, 656, 671, 627, 544, 664, 631, 311, 311,
    550, 552, 550, 591, 962, 730, 703, 734, 716, 622, 604, 738, 721, 300, 627, 689, 589, 915, 750, 776, 672, 769, 697, 681, 599, 703, 730, 1015,
    688, 631, 594, 390, 501, 390, 461, 561, 278, 594, 634, 598, 634, 605, 447, 634, 611, 281, 331, 647, 313, 900, 611, 618, 634, 634, 425, 570,
    445, 607, 609, 849, 650, 586, 583, 408, 294, 408, 523,
  ],
};
const ELLIPSIS_WIDTH: Record<FontWeight, number> = { 400: 0.571, 600: 0.654, 700: 0.695 };
/** Over-estimate a little so a computed line never comes out wider than its box when drawn. */
const SAFETY = 1.06;
export const ELLIPSIS = "…";

function charWidth(ch: string, weight: FontWeight): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 32 && code < 127) return ASCII_WIDTHS[weight][code - 32] / 1000;
  if (code === 0x2026) return ELLIPSIS_WIDTH[weight];
  // CJK and other wide scripts come from fallback fonts at roughly a full em.
  return code >= 0x2e80 ? 1 : weight === 400 ? 0.65 : 0.7;
}

export function textWidth(text: string, fontSize: number, letterSpacing = 0, weight: FontWeight = 400): number {
  let w = 0;
  for (const ch of text) w += charWidth(ch, weight) * fontSize + letterSpacing;
  return w * SAFETY;
}

/** Greedy word wrap; a single word wider than the box is broken between characters. */
export function wrapText(text: string, fontSize: number, maxWidth: number, letterSpacing = 0, weight: FontWeight = 400): string[] {
  return wrap(text, fontSize, maxWidth, letterSpacing, weight).lines;
}

function wrap(text: string, fontSize: number, maxWidth: number, letterSpacing: number, weight: FontWeight): { lines: string[]; splitWord: boolean } {
  const fits = (s: string) => textWidth(s, fontSize, letterSpacing, weight) <= maxWidth;
  const lines: string[] = [];
  let line = "";
  let splitWord = false;
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
      splitWord = true;
      const chars = [...rest];
      let n = 1;
      while (n < chars.length && fits(chars.slice(0, n + 1).join(""))) n++;
      lines.push(chars.slice(0, n).join(""));
      rest = chars.slice(n).join("");
    }
    line = rest;
  }
  if (line) lines.push(line);
  return { lines, splitWord };
}

/** Keeps the first `maxLines` lines, ending the last one at a word boundary with an ellipsis. */
function clampLines(lines: string[], maxLines: number, fontSize: number, maxWidth: number, letterSpacing: number, weight: FontWeight): string[] {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  const fits = (s: string) => textWidth(`${s}${ELLIPSIS}`, fontSize, letterSpacing, weight) <= maxWidth;
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
  weight: FontWeight;
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
  weight?: FontWeight;
};

/**
 * Picks the largest size at which the text wraps within `maxLines` (and `maxHeight`) with every
 * word whole. Only if no size manages that does a word wider than the box get split, at the
 * largest size that then fits ("Tool4Boxology" shrinks to one line rather than "Tool4Boxol / ogy").
 * If none fits either way, uses the smallest size and truncates at a word boundary with an ellipsis.
 */
export function fitText(text: string, opts: FitOptions): FittedText {
  const { sizes, maxWidth, maxLines, lineHeight, maxHeight, letterSpacing = 0, weight = 400 } = opts;
  if (sizes.length === 0) throw new Error("fitText needs at least one font size");
  const allowedLines = (size: number) =>
    Math.max(1, Math.min(maxLines, maxHeight === undefined ? maxLines : Math.floor(maxHeight / (size * lineHeight) + 1e-6)));
  const result = (fontSize: number, lines: string[], truncated: boolean): FittedText => ({
    fontSize,
    lineHeight,
    letterSpacing,
    weight,
    lines,
    width: Math.max(0, ...lines.map((l) => textWidth(l, fontSize, letterSpacing, weight))),
    height: lines.length * fontSize * lineHeight,
    truncated,
  });

  const wrapped = sizes.map((size) => ({ size, ...wrap(text, size, maxWidth, letterSpacing, weight) }));
  const fitting = wrapped.filter(({ size, lines }) => lines.length <= allowedLines(size));
  const best = fitting.find((w) => !w.splitWord) ?? fitting[0];
  if (best) return result(best.size, best.lines, false);
  const size = sizes[sizes.length - 1];
  const lines = wrapText(text, size, maxWidth, letterSpacing, weight);
  return result(size, clampLines(lines, allowedLines(size), size, maxWidth, letterSpacing, weight), true);
}
