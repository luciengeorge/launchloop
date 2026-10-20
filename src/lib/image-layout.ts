import { fitText, type FittedText } from "./image-fit";
import { IMAGE_VARIANTS, type ImageVariant } from "./image-variants";

/**
 * Plans every text block of a kit image before it is drawn: font sizes, line breaks and the box
 * each block occupies. Blocks stack in normal flex flow inside the padded frame, so the boxes here
 * are the boxes Satori draws, and nothing is allowed to overflow its budget: long text shrinks in
 * steps, then truncates, and the X image drops feature pills before anything would overlap.
 */

export type KitImageContent = { name: string; tagline: string; headline: string; features: string[]; domain: string };
export type Box = { x: number; y: number; width: number; height: number };
export type LaidOutBox = { id: string; box: Box };

/** A rounded pill: text plus padding, an optional leading dot and an optional 1px border. */
export type PillPlan = { text: FittedText; padX: number; padY: number; dot: number; gap: number; border: number; width: number; height: number };

export type XPlan = { variant: "x"; name: PillPlan; headline: FittedText; pills: PillPlan[]; domain: FittedText | null };
export type OgPlan = { variant: "og"; domain: PillPlan; name: FittedText; tagline: FittedText };
export type PhPlan = { variant: "ph"; name: FittedText; tagline: FittedText; cards: { number: FittedText; text: FittedText }[] };
export type KitImagePlan = (XPlan | OgPlan | PhPlan) & { width: number; height: number; padding: number; scale: number; boxes: LaidOutBox[] };

export const X_HEADLINE_SIZES = [92, 80, 68, 58, 50] as const;
export const X_PILL_SIZES = [32, 28, 24] as const;
export const MAX_HEADLINE_LINES = 3;
export const MAX_PILL_LINES = 2;
export const MAX_FEATURES = 3;

const X_GAP = 40;
const X_PILL_GAP = 20;
const X_TEXT_MAX_WIDTH = 1300;
const OG_STACK_GAP = 20;
const OG_MIN_GAP = 24;
const OG_BAR_HEIGHT = 10;
const PH_HEADER_GAP = 16;
const PH_SECTION_GAP = 48;
const PH_CARD_GAP = 28;
const PH_CARD_PADDING = 36;
const PH_CARD_BORDER = 2;
const PH_CARD_INNER_GAP = 16;

function pill(text: string, o: { sizes: readonly number[]; maxWidth: number; maxLines: number; padX: number; padY: number; dot?: number; gap?: number; border?: number }): PillPlan {
  const dot = o.dot ?? 0;
  const gap = dot ? (o.gap ?? 0) : 0;
  const border = o.border ?? 0;
  const chrome = 2 * o.padX + dot + gap + 2 * border;
  const fitted = fitText(text, { sizes: o.sizes, maxWidth: o.maxWidth - chrome, maxLines: o.maxLines, lineHeight: 1.2 });
  return {
    text: fitted,
    padX: o.padX,
    padY: o.padY,
    dot,
    gap,
    border,
    width: fitted.width + chrome,
    height: Math.max(fitted.height, dot) + 2 * o.padY + 2 * border,
  };
}

/** Greedy flex-wrap rows (centered), as Satori lays out `flexWrap: wrap; justifyContent: center`. */
function packRows(items: { width: number; height: number }[], rowWidth: number, gap: number) {
  const rows: { indices: number[]; width: number; height: number }[] = [];
  items.forEach((item, i) => {
    const row = rows[rows.length - 1];
    if (row && row.width + gap + item.width <= rowWidth) {
      row.indices.push(i);
      row.width += gap + item.width;
      row.height = Math.max(row.height, item.height);
    } else {
      rows.push({ indices: [i], width: item.width, height: item.height });
    }
  });
  const height = rows.reduce((h, r) => h + r.height, 0) + gap * Math.max(0, rows.length - 1);
  return { rows, height };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function planX(c: KitImageContent, inner: Box, scale: number): Pick<XPlan, "variant" | "name" | "headline" | "pills" | "domain"> & { boxes: LaidOutBox[] } {
  const name = pill(c.name, { sizes: [24 * scale, 20 * scale], maxWidth: X_TEXT_MAX_WIDTH, maxLines: 1, padX: 22 * scale, padY: 10 * scale, dot: 12 * scale, gap: 12 * scale, border: 1 });
  const domain = c.domain ? fitText(c.domain, { sizes: [30, 26], maxWidth: inner.width, maxLines: 1, lineHeight: 1.2 }) : null;
  const fixed = name.height + X_GAP + (domain ? X_GAP + domain.height : 0);
  const headline = fitText(c.headline, {
    sizes: X_HEADLINE_SIZES,
    maxWidth: X_TEXT_MAX_WIDTH,
    maxLines: MAX_HEADLINE_LINES,
    lineHeight: 1.08,
    letterSpacing: -2,
    maxHeight: inner.height - fixed,
  });

  // Largest pill size at which all remaining pills fit; drop the last pill when none does.
  const budget = inner.height - fixed - headline.height;
  let pills: PillPlan[] = [];
  let packed = packRows([], inner.width, X_PILL_GAP);
  outer: for (let n = Math.min(MAX_FEATURES, c.features.length); n > 0; n--) {
    for (const size of X_PILL_SIZES) {
      const candidate = c.features.slice(0, n).map((f) => pill(f, { sizes: [size], maxWidth: X_TEXT_MAX_WIDTH, maxLines: MAX_PILL_LINES, padX: 28, padY: 14 }));
      const rows = packRows(candidate, inner.width, X_PILL_GAP);
      if (X_GAP + rows.height <= budget) {
        pills = candidate;
        packed = rows;
        break outer;
      }
    }
  }

  const stack = [name.height, headline.height, ...(pills.length ? [packed.height] : []), ...(domain ? [domain.height] : [])];
  const total = sum(stack) + X_GAP * (stack.length - 1);
  let y = inner.y + (inner.height - total) / 2;
  const centered = (id: string, width: number, height: number): LaidOutBox => ({ id, box: { x: inner.x + (inner.width - width) / 2, y, width, height } });

  const boxes: LaidOutBox[] = [centered("name", name.width, name.height)];
  y += name.height + X_GAP;
  boxes.push(centered("headline", headline.width, headline.height));
  y += headline.height + X_GAP;
  if (pills.length) {
    let rowY = y;
    for (const row of packed.rows) {
      let x = inner.x + (inner.width - row.width) / 2;
      for (const i of row.indices) {
        const p = pills[i];
        boxes.push({ id: `pill-${i}`, box: { x, y: rowY + (row.height - p.height) / 2, width: p.width, height: p.height } });
        x += p.width + X_PILL_GAP;
      }
      rowY += row.height + X_PILL_GAP;
    }
    y += packed.height + X_GAP;
  }
  if (domain) boxes.push(centered("domain", domain.width, domain.height));
  return { variant: "x", name, headline, pills, domain, boxes };
}

function planOg(c: KitImageContent, inner: Box, scale: number): Pick<OgPlan, "variant" | "domain" | "name" | "tagline"> & { boxes: LaidOutBox[] } {
  const domain = pill(c.domain || "Now live", { sizes: [24 * scale, 20 * scale], maxWidth: inner.width, maxLines: 1, padX: 22 * scale, padY: 10 * scale, dot: 12 * scale, gap: 12 * scale, border: 1 });
  const taglineSizes = [44, 38, 32] as const;
  const middleMax = inner.height - domain.height - OG_BAR_HEIGHT - 2 * OG_MIN_GAP;
  const minTagline = c.tagline ? 3 * taglineSizes[taglineSizes.length - 1] * 1.25 : 0;
  const name = fitText(c.name, { sizes: [96, 80, 64], maxWidth: inner.width, maxLines: 2, lineHeight: 1, letterSpacing: -2, maxHeight: middleMax - OG_STACK_GAP - minTagline });
  const tagline = fitText(c.tagline, { sizes: taglineSizes, maxWidth: Math.min(980, inner.width), maxLines: 3, lineHeight: 1.25, maxHeight: middleMax - OG_STACK_GAP - name.height });

  const middle = name.height + OG_STACK_GAP + tagline.height;
  const gap = (inner.height - domain.height - middle - OG_BAR_HEIGHT) / 2;
  const nameY = inner.y + domain.height + gap;
  return {
    variant: "og",
    domain,
    name,
    tagline,
    boxes: [
      { id: "domain", box: { x: inner.x, y: inner.y, width: domain.width, height: domain.height } },
      { id: "name", box: { x: inner.x, y: nameY, width: name.width, height: name.height } },
      { id: "tagline", box: { x: inner.x, y: nameY + name.height + OG_STACK_GAP, width: tagline.width, height: tagline.height } },
      { id: "bar", box: { x: inner.x, y: inner.y + inner.height - OG_BAR_HEIGHT, width: 220, height: OG_BAR_HEIGHT } },
    ],
  };
}

function planPh(c: KitImageContent, inner: Box): Pick<PhPlan, "variant" | "name" | "tagline" | "cards"> & { boxes: LaidOutBox[] } {
  const numberLine = 30 * 1.2;
  const cardChrome = 2 * (PH_CARD_PADDING + PH_CARD_BORDER) + numberLine + PH_CARD_INNER_GAP;
  const featureSizes = [38, 32, 28, 24] as const;
  const minCards = c.features.length ? cardChrome + 2 * featureSizes[featureSizes.length - 1] * 1.2 + PH_SECTION_GAP : 0;
  const taglineSizes = [42, 36, 30] as const;
  const minTagline = c.tagline ? 2 * taglineSizes[taglineSizes.length - 1] * 1.25 : 0;
  const name = fitText(c.name, { sizes: [84, 70, 58], maxWidth: inner.width, maxLines: 2, lineHeight: 1, letterSpacing: -2, maxHeight: inner.height - minCards - PH_HEADER_GAP - minTagline });
  const tagline = fitText(c.tagline, { sizes: taglineSizes, maxWidth: inner.width, maxLines: 2, lineHeight: 1.25, maxHeight: inner.height - minCards - PH_HEADER_GAP - name.height });
  const header = name.height + PH_HEADER_GAP + tagline.height;

  const boxes: LaidOutBox[] = [
    { id: "name", box: { x: inner.x, y: inner.y, width: name.width, height: name.height } },
    { id: "tagline", box: { x: inner.x, y: inner.y + name.height + PH_HEADER_GAP, width: tagline.width, height: tagline.height } },
  ];
  const features = c.features.slice(0, MAX_FEATURES);
  const cardsY = inner.y + header + PH_SECTION_GAP;
  const cardsHeight = inner.y + inner.height - cardsY;
  const textMaxHeight = cardsHeight - cardChrome;
  if (!features.length || textMaxHeight < featureSizes[featureSizes.length - 1] * 1.2) return { variant: "ph", name, tagline, cards: [], boxes };

  const cardWidth = (inner.width - PH_CARD_GAP * (features.length - 1)) / features.length;
  const textWidth = cardWidth - 2 * (PH_CARD_PADDING + PH_CARD_BORDER);
  const cards = features.map((f, i) => ({
    number: fitText(`0${i + 1}`, { sizes: [30], maxWidth: textWidth, maxLines: 1, lineHeight: 1.2 }),
    text: fitText(f, { sizes: featureSizes, maxWidth: textWidth, maxLines: 8, lineHeight: 1.2, maxHeight: textMaxHeight }),
  }));
  cards.forEach((card, i) => {
    const x = inner.x + i * (cardWidth + PH_CARD_GAP);
    const contentX = x + PH_CARD_PADDING + PH_CARD_BORDER;
    const bottom = cardsY + cardsHeight - PH_CARD_PADDING - PH_CARD_BORDER;
    boxes.push({ id: `card-${i}`, box: { x, y: cardsY, width: cardWidth, height: cardsHeight } });
    boxes.push({ id: `card-${i}-number`, box: { x: contentX, y: cardsY + PH_CARD_PADDING + PH_CARD_BORDER, width: card.number.width, height: card.number.height } });
    boxes.push({ id: `card-${i}-text`, box: { x: contentX, y: bottom - card.text.height, width: card.text.width, height: card.text.height } });
  });
  return { variant: "ph", name, tagline, cards, boxes };
}

export function planKitImage(variant: ImageVariant, content: KitImageContent): KitImagePlan {
  const { width, height } = IMAGE_VARIANTS[variant];
  const scale = width / 1200;
  const padding = 72 * scale;
  const inner: Box = { x: padding, y: padding, width: width - 2 * padding, height: height - 2 * padding };
  const base = { width, height, padding, scale };
  switch (variant) {
    case "x":
      return { ...base, ...planX(content, inner, scale) };
    case "og":
      return { ...base, ...planOg(content, inner, scale) };
    case "ph":
      return { ...base, ...planPh(content, inner) };
    default: {
      const unreachable: never = variant;
      throw new Error(`Unknown image variant: ${String(unreachable)}`);
    }
  }
}
