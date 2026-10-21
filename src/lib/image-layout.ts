import { fitText, type FittedText, type FontWeight } from "./image-fit";
import { IMAGE_VARIANTS, type ImageVariant } from "./image-variants";

/**
 * Plans every block of a kit image before it is drawn: font sizes, line breaks and the exact box
 * each block occupies. The renderer positions each block absolutely at its box, so the boxes here
 * are the boxes Satori draws. Nothing may overflow its budget: long text shrinks in steps, then
 * truncates at a word boundary, and optional blocks (feature pills, the feature list) are dropped
 * before anything would overlap.
 *
 * Each size has two layouts: "shot", built around the product screenshot in a browser frame that
 * runs off the canvas edge, and "type", a bolder type-led layout with a large logo tile.
 */

export type KitImageContent = { name: string; tagline: string; headline: string; features: string[]; domain: string };
export type ShotSize = { width: number; height: number };
export type KitImageMedia = { screenshot?: ShotSize; watermark: boolean };
export type Box = { x: number; y: number; width: number; height: number };
/**
 * content: text and the logo, inside the padded frame, overlapping nothing.
 * media: the screenshot frame, which may run off the canvas but never under content.
 * overlay: the preview badge, inside the canvas, over media at most.
 */
export type BoxLayer = "content" | "media" | "overlay";
export type LaidOutBox = { id: string; box: Box; layer: BoxLayer };

export type TextBlock = { text: FittedText; box: Box };
/** A rounded pill: text plus padding, an optional leading dot and an optional border. */
export type PillPlan = { text: FittedText; padX: number; padY: number; dot: number; gap: number; border: number; width: number; height: number };
export type PillBlock = PillPlan & { box: Box };
export type MarkPlan = { box: Box; radius: number };
/** The browser frame: `image` is relative to the content area under the toolbar and may be larger than it (cropped). */
export type ShotPlan = { frame: Box; toolbar: number; radius: number; border: number; image: Box; url: FittedText | null; urlBox: Box | null };
export type BadgePlan = PillBlock;
export type FeatureItem = { bullet: Box; text: TextBlock };
export type CardPlan = { box: Box; number: TextBlock; text: TextBlock };

type Common = {
  width: number;
  height: number;
  padding: number;
  layout: "shot" | "type";
  mark: MarkPlan;
  name: TextBlock;
  shot: ShotPlan | null;
  badge: BadgePlan | null;
  boxes: LaidOutBox[];
};
export type OgPlan = Common & { variant: "og"; tagline: TextBlock | null; domain: PillBlock | null };
export type XPlan = Common & { variant: "x"; headline: TextBlock | null; pills: PillBlock[]; domain: TextBlock | null };
export type PhPlan = Common & { variant: "ph"; tagline: TextBlock | null; domain: TextBlock | PillBlock | null; features: FeatureItem[]; cards: CardPlan[] };
export type KitImagePlan = OgPlan | XPlan | PhPlan;

export const MAX_FEATURES = 3;
export const MAX_PILL_LINES = 2;
export const MAX_NAME_LINES = 2;
export const MAX_TAGLINE_LINES = 3;
export const X_NAME_SIZES = [152, 136, 120, 104, 92, 80] as const;
export const X_HEADLINE_SIZES = [50, 46, 42, 38, 34] as const;
export const X_PILL_SIZES = [30, 27, 24] as const;

const BADGE_TEXT = "Free preview · launchloop.dev";

function text(value: string, o: { sizes: readonly number[]; maxWidth: number; maxLines: number; lineHeight: number; weight?: FontWeight; letterSpacing?: number; maxHeight?: number }) {
  return fitText(value, { ...o, maxHeight: o.maxHeight === undefined ? undefined : Math.max(0, o.maxHeight) });
}

function pill(value: string, o: { sizes: readonly number[]; maxWidth: number; maxLines: number; padX: number; padY: number; dot?: number; gap?: number; border?: number; weight?: FontWeight }): PillPlan {
  const dot = o.dot ?? 0;
  const gap = dot ? (o.gap ?? 0) : 0;
  const border = o.border ?? 0;
  const chrome = 2 * o.padX + dot + gap + 2 * border;
  const fitted = fitText(value, { sizes: o.sizes, maxWidth: o.maxWidth - chrome, maxLines: o.maxLines, lineHeight: 1.2, weight: o.weight ?? 600 });
  return { text: fitted, padX: o.padX, padY: o.padY, dot, gap, border, width: fitted.width + chrome, height: Math.max(fitted.height, dot) + 2 * o.padY + 2 * border };
}

const at = (x: number, y: number, t: { width: number; height: number }): Box => ({ x, y, width: t.width, height: t.height });
const block = (t: FittedText, x: number, y: number): TextBlock => ({ text: t, box: at(x, y, t) });
const placePill = (p: PillPlan, x: number, y: number): PillBlock => ({ ...p, box: at(x, y, p) });
const hasText = (t: FittedText) => t.lines.length > 0;

function badgeFor(variant: ImageVariant, width: number, height: number): BadgePlan {
  const s = { og: { size: 20, inset: 22 }, x: { size: 26, inset: 30 }, ph: { size: 21, inset: 24 } }[variant];
  const p = pill(BADGE_TEXT, { sizes: [s.size], maxWidth: width, maxLines: 1, padX: s.size * 0.85, padY: s.size * 0.5, dot: s.size * 0.5, gap: s.size * 0.5, weight: 600 });
  return placePill(p, width - s.inset - p.width, height - s.inset - p.height);
}

/** Sizes the screenshot to cover the part of the frame that is visible on the canvas, anchored top-left. */
function planShot(frame: Box, shot: ShotSize, canvas: { width: number; height: number }, o: { toolbar: number; radius: number; domain: string }): ShotPlan {
  const border = 1;
  const contentWidth = frame.width - 2 * border;
  const visibleWidth = Math.min(frame.x + frame.width, canvas.width) - frame.x - border;
  const visibleHeight = Math.min(frame.y + frame.height, canvas.height) - frame.y - o.toolbar;
  const scale = Math.max(Math.min(contentWidth, visibleWidth) / shot.width, visibleHeight / shot.height);
  const image = { x: 0, y: 0, width: shot.width * scale, height: shot.height * scale };
  const urlMaxWidth = Math.min(visibleWidth * 0.56, 520);
  const url = o.domain ? fitText(o.domain, { sizes: [o.toolbar * 0.4], maxWidth: urlMaxWidth - o.toolbar * 0.8, maxLines: 1, lineHeight: 1.2 }) : null;
  const urlBox = url ? { x: (visibleWidth - urlMaxWidth) / 2 + border, y: o.toolbar * 0.2, width: urlMaxWidth, height: o.toolbar * 0.6 } : null;
  return { frame, toolbar: o.toolbar, radius: o.radius, border, image, url, urlBox };
}

/** Name above tagline, both shrinking to fit `maxHeight`; the tagline keeps at least `minTaglineLines` lines of room. */
function nameAndTagline(
  c: KitImageContent,
  o: {
    width: number;
    maxHeight: number;
    gap: number;
    nameSizes: readonly number[];
    nameSpacing: number;
    taglineSizes: readonly number[];
    taglineLines: number;
    taglineWidth?: number;
    taglineLineHeight?: number;
    minTaglineLines?: number;
    taglineText?: string;
  },
) {
  const tagline = o.taglineText ?? c.tagline;
  const taglineLh = o.taglineLineHeight ?? 1.3;
  const minTagline = tagline ? o.gap + (o.minTaglineLines ?? 2) * o.taglineSizes[o.taglineSizes.length - 1] * taglineLh : 0;
  const name = text(c.name, { sizes: o.nameSizes, maxWidth: o.width, maxLines: MAX_NAME_LINES, lineHeight: 1.02, weight: 700, letterSpacing: o.nameSpacing, maxHeight: o.maxHeight - minTagline });
  const tag = text(tagline, {
    sizes: o.taglineSizes,
    maxWidth: o.taglineWidth ?? o.width,
    maxLines: o.taglineLines,
    lineHeight: taglineLh,
    maxHeight: o.maxHeight - name.height - o.gap,
  });
  const height = name.height + (hasText(tag) ? o.gap + tag.height : 0);
  return { name, tagline: tag, height };
}

/** Greedy flex-wrap rows, left-aligned or centered. */
function packRows(items: { width: number; height: number }[], rowWidth: number, gap: number) {
  const rows: { indices: number[]; width: number; height: number }[] = [];
  items.forEach((item, i) => {
    const row = rows[rows.length - 1];
    if (row && row.width + gap + item.width <= rowWidth) {
      row.indices.push(i);
      row.width += gap + item.width;
      row.height = Math.max(row.height, item.height);
    } else rows.push({ indices: [i], width: item.width, height: item.height });
  });
  return { rows, height: rows.reduce((h, r) => h + r.height, 0) + gap * Math.max(0, rows.length - 1) };
}

function finish<T extends Omit<KitImagePlan, "boxes">>(plan: T, extra: LaidOutBox[]): T & { boxes: LaidOutBox[] } {
  const boxes: LaidOutBox[] = [{ id: "mark", box: plan.mark.box, layer: "content" }, { id: "name", box: plan.name.box, layer: "content" }, ...extra];
  if (plan.shot) boxes.push({ id: "shot", box: plan.shot.frame, layer: "media" });
  if (plan.badge) boxes.push({ id: "badge", box: plan.badge.box, layer: "overlay" });
  return { ...plan, boxes };
}

function planOg(c: KitImageContent, m: KitImageMedia): OgPlan {
  const W = 1200;
  const H = 630;
  const P = 64;
  const badge = m.watermark ? badgeFor("og", W, H) : null;
  const domainPill = (maxWidth: number) =>
    c.domain ? pill(c.domain, { sizes: [22, 20], maxWidth, maxLines: 1, padX: 18, padY: 10, dot: 10, gap: 10, border: 1, weight: 600 }) : null;

  if (m.screenshot) {
    const mark: MarkPlan = { box: { x: P, y: P, width: 64, height: 64 }, radius: 16 };
    const frameX = 652;
    const colW = frameX - 48 - P;
    const shot = planShot({ x: frameX, y: 96, width: 640, height: H - 96 + 48 }, m.screenshot, { width: W, height: H }, { toolbar: 34, radius: 14, domain: c.domain });
    const domain = domainPill(colW);
    const domainY = H - P - (domain?.height ?? 0);
    const top = P + 64 + 32;
    const bottom = domain ? domainY - 28 : H - P;
    const stack = nameAndTagline(c, { width: colW, maxHeight: bottom - top, gap: 18, nameSizes: [84, 76, 68, 60, 52], nameSpacing: -2.5, taglineSizes: [34, 31, 28, 25], taglineLines: MAX_TAGLINE_LINES });
    const y = top + (bottom - top - stack.height) / 2;
    const name = block(stack.name, P, y);
    const tagline = hasText(stack.tagline) ? block(stack.tagline, P, y + stack.name.height + 18) : null;
    const domainBlock = domain ? placePill(domain, P, domainY) : null;
    return finish({ variant: "og", layout: "shot", width: W, height: H, padding: P, mark, name, tagline, domain: domainBlock, shot, badge }, [
      ...(tagline ? [{ id: "tagline", box: tagline.box, layer: "content" as const }] : []),
      ...(domainBlock ? [{ id: "domain", box: domainBlock.box, layer: "content" as const }] : []),
    ]);
  }

  const tile = 232;
  const mark: MarkPlan = { box: { x: W - P - tile, y: (H - tile) / 2, width: tile, height: tile }, radius: 56 };
  const colW = mark.box.x - 56 - P;
  const domain = domainPill(colW);
  const top = P + (domain ? domain.height + 36 : 0);
  const bottom = H - P;
  const stack = nameAndTagline(c, {
    width: colW,
    maxHeight: bottom - top,
    gap: 22,
    nameSizes: [124, 112, 100, 88, 76, 64],
    nameSpacing: -4,
    taglineSizes: [44, 40, 36, 32, 28],
    taglineLines: MAX_TAGLINE_LINES,
    taglineWidth: Math.min(colW, 760),
    taglineLineHeight: 1.28,
  });
  const y = top + (bottom - top - stack.height) / 2;
  const name = block(stack.name, P, y);
  const tagline = hasText(stack.tagline) ? block(stack.tagline, P, y + stack.name.height + 22) : null;
  const domainBlock = domain ? placePill(domain, P, P) : null;
  return finish({ variant: "og", layout: "type", width: W, height: H, padding: P, mark, name, tagline, domain: domainBlock, shot: null, badge }, [
    ...(tagline ? [{ id: "tagline", box: tagline.box, layer: "content" as const }] : []),
    ...(domainBlock ? [{ id: "domain", box: domainBlock.box, layer: "content" as const }] : []),
  ]);
}

function planX(c: KitImageContent, m: KitImageMedia): XPlan {
  const W = 1600;
  const H = 900;
  const P = 80;
  const badge = m.watermark ? badgeFor("x", W, H) : null;

  if (m.screenshot) {
    const markSize = 84;
    const gap = 28;
    const nameFit = text(c.name, { sizes: [92, 84, 76, 68, 60], maxWidth: W - 2 * P - markSize - gap, maxLines: 1, lineHeight: 1.05, weight: 700, letterSpacing: -3 });
    const rowH = Math.max(markSize, nameFit.height);
    const rowX = (W - (markSize + gap + nameFit.width)) / 2;
    const mark: MarkPlan = { box: { x: rowX, y: P + (rowH - markSize) / 2, width: markSize, height: markSize }, radius: 22 };
    const name = block(nameFit, rowX + markSize + gap, P + (rowH - nameFit.height) / 2);
    const headFit = text(c.headline, { sizes: [42, 38, 34, 31], maxWidth: 1240, maxLines: 2, lineHeight: 1.3 });
    const headline = hasText(headFit) ? block(headFit, (W - headFit.width) / 2, P + rowH + 22) : null;
    const frameY = (headline ? headline.box.y + headline.box.height : P + rowH) + 52;
    const shot = planShot({ x: 160, y: frameY, width: 1280, height: H - frameY + 48 }, m.screenshot, { width: W, height: H }, { toolbar: 46, radius: 18, domain: c.domain });
    return finish({ variant: "x", layout: "shot", width: W, height: H, padding: P, mark, name, headline, pills: [], domain: null, shot, badge }, [
      ...(headline ? [{ id: "headline", box: headline.box, layer: "content" as const }] : []),
    ]);
  }

  const markSize = 104;
  const mark: MarkPlan = { box: { x: P, y: P, width: markSize, height: markSize }, radius: 28 };
  const domainFit = c.domain ? text(c.domain, { sizes: [30, 26], maxWidth: W - 2 * P - markSize - 28, maxLines: 1, lineHeight: 1.2, weight: 600 }) : null;
  const domain = domainFit ? block(domainFit, P + markSize + 28, P + (markSize - domainFit.height) / 2) : null;
  const innerW = W - 2 * P;
  const top = P + markSize + 44;
  const bottom = badge ? Math.min(H - P, badge.box.y - 16) : H - P;
  const sectionGap = 48;

  // Largest pill size at which the pills fit under the minimum name; drop the last pill when none does.
  const minStack = X_NAME_SIZES[X_NAME_SIZES.length - 1] * 1.02 + (c.headline ? 22 + X_HEADLINE_SIZES[X_HEADLINE_SIZES.length - 1] * 1.25 : 0);
  let pills: PillPlan[] = [];
  let packed = packRows([], innerW, 18);
  outer: for (let n = Math.min(MAX_FEATURES, c.features.length); n > 0; n--) {
    for (const size of X_PILL_SIZES) {
      const candidate = c.features.slice(0, n).map((f) => pill(f, { sizes: [size], maxWidth: innerW, maxLines: MAX_PILL_LINES, padX: 26, padY: 14, dot: 12, gap: 14, border: 2 }));
      const rows = packRows(candidate, innerW, 18);
      if (rows.height + sectionGap + minStack <= bottom - top) {
        pills = candidate;
        packed = rows;
        break outer;
      }
    }
  }
  const pillsTop = bottom - packed.height;
  const stackBottom = pills.length ? pillsTop - sectionGap : bottom;
  const stack = nameAndTagline(c, {
    width: innerW,
    maxHeight: stackBottom - top,
    gap: 22,
    nameSizes: X_NAME_SIZES,
    nameSpacing: -5,
    taglineSizes: X_HEADLINE_SIZES,
    taglineLines: MAX_TAGLINE_LINES,
    taglineWidth: 1180,
    taglineLineHeight: 1.25,
    minTaglineLines: 1,
    taglineText: c.headline,
  });
  const y = top + (stackBottom - top - stack.height) / 2;
  const name = block(stack.name, P, y);
  const headline = hasText(stack.tagline) ? block(stack.tagline, P, y + stack.name.height + 22) : null;
  const pillBlocks: PillBlock[] = [];
  let rowY = pillsTop;
  for (const row of packed.rows) {
    let x = P;
    for (const i of row.indices) {
      pillBlocks[i] = placePill(pills[i], x, rowY + (row.height - pills[i].height) / 2);
      x += pills[i].width + 18;
    }
    rowY += row.height + 18;
  }
  return finish({ variant: "x", layout: "type", width: W, height: H, padding: P, mark, name, headline, pills: pillBlocks, domain, shot: null, badge }, [
    ...(headline ? [{ id: "headline", box: headline.box, layer: "content" as const }] : []),
    ...(domain ? [{ id: "domain", box: domain.box, layer: "content" as const }] : []),
    ...pillBlocks.map((p, i) => ({ id: `pill-${i}`, box: p.box, layer: "content" as const })),
  ]);
}

function planPh(c: KitImageContent, m: KitImageMedia): PhPlan {
  const W = 1270;
  const H = 760;
  const P = 64;
  const badge = m.watermark ? badgeFor("ph", W, H) : null;
  const features = c.features.slice(0, MAX_FEATURES).filter(Boolean);

  if (m.screenshot) {
    const mark: MarkPlan = { box: { x: P, y: P, width: 64, height: 64 }, radius: 16 };
    const colW = 440;
    const frameX = P + colW + 52;
    const shot = planShot({ x: frameX, y: P, width: 780, height: H - P + 48 }, m.screenshot, { width: W, height: H }, { toolbar: 38, radius: 16, domain: c.domain });
    const domainFit = c.domain ? pill(c.domain, { sizes: [20, 18], maxWidth: colW, maxLines: 1, padX: 16, padY: 9, dot: 9, gap: 9, border: 1, weight: 600 }) : null;
    const domainY = H - P - (domainFit?.height ?? 0);
    const top = P + 64 + 36;
    const bottom = domainFit ? domainY - 28 : H - P;
    const featureSizes = [24, 22, 20] as const;
    const bullet = 30;
    const itemGap = 16;
    const sectionGap = 34;
    const minList = features.length ? sectionGap + bullet : 0;
    const stack = nameAndTagline(c, { width: colW, maxHeight: bottom - top - minList, gap: 16, nameSizes: [72, 64, 58, 52, 46], nameSpacing: -2.5, taglineSizes: [30, 27, 25, 23], taglineLines: MAX_TAGLINE_LINES });
    const budget = bottom - top - stack.height - sectionGap;
    let list: FittedText[] = [];
    outer: for (let n = features.length; n > 0; n--) {
      for (const size of featureSizes) {
        const items = features.slice(0, n).map((f) => text(f, { sizes: [size], maxWidth: colW - bullet - 14, maxLines: 2, lineHeight: 1.3, weight: 600 }));
        const height = items.reduce((h, t) => h + Math.max(bullet, t.height), 0) + itemGap * (items.length - 1);
        if (height <= budget) {
          list = items;
          break outer;
        }
      }
    }
    const name = block(stack.name, P, top);
    const tagline = hasText(stack.tagline) ? block(stack.tagline, P, top + stack.name.height + 16) : null;
    let y = top + stack.height + sectionGap;
    const items: FeatureItem[] = list.map((t) => {
      const rowH = Math.max(bullet, t.height);
      const textY = y + (rowH - t.height) / 2;
      // The bullet sits on the first line, never above the row.
      const bulletY = Math.max(y, textY + (t.fontSize * t.lineHeight - bullet) / 2);
      const item = { bullet: { x: P, y: bulletY, width: bullet, height: bullet }, text: block(t, P + bullet + 14, textY) };
      y += rowH + itemGap;
      return item;
    });
    const domain = domainFit ? placePill(domainFit, P, domainY) : null;
    return finish({ variant: "ph", layout: "shot", width: W, height: H, padding: P, mark, name, tagline, domain, features: items, cards: [], shot, badge }, [
      ...(tagline ? [{ id: "tagline", box: tagline.box, layer: "content" as const }] : []),
      ...(domain ? [{ id: "domain", box: domain.box, layer: "content" as const }] : []),
      ...items.flatMap((it, i) => [
        { id: `feature-${i}-bullet`, box: it.bullet, layer: "content" as const },
        { id: `feature-${i}`, box: it.text.box, layer: "content" as const },
      ]),
    ]);
  }

  const markSize = 72;
  const mark: MarkPlan = { box: { x: P, y: P, width: markSize, height: markSize }, radius: 20 };
  const domainFit = c.domain ? text(c.domain, { sizes: [26, 23], maxWidth: W - 2 * P - markSize - 24, maxLines: 1, lineHeight: 1.2, weight: 600 }) : null;
  const domain = domainFit ? block(domainFit, P + markSize + 24, P + (markSize - domainFit.height) / 2) : null;
  const innerW = W - 2 * P;
  const top = P + markSize + 36;
  const bottom = badge ? badge.box.y - 18 : H - P;
  const cardPad = 30;
  const cardBorder = 2;
  const cardGap = 24;
  const numberLine = 26 * 1.2;
  const innerGap = 14;
  const featureSizes = [32, 28, 25, 22] as const;
  const cardChrome = 2 * (cardPad + cardBorder) + numberLine + innerGap;
  const minCards = features.length ? 40 + cardChrome + 2 * featureSizes[featureSizes.length - 1] * 1.2 : 0;
  const stack = nameAndTagline(c, { width: innerW, maxHeight: bottom - top - minCards, gap: 14, nameSizes: [96, 84, 72, 62, 54], nameSpacing: -3, taglineSizes: [36, 32, 29, 26], taglineLines: 2, taglineWidth: 1040, minTaglineLines: 1 });
  const name = block(stack.name, P, top);
  const tagline = hasText(stack.tagline) ? block(stack.tagline, P, top + stack.name.height + 14) : null;
  const cardsY = top + stack.height + 40;
  const cardsH = bottom - cardsY;
  const textMaxHeight = cardsH - cardChrome;
  const cards: CardPlan[] = [];
  if (features.length && textMaxHeight >= featureSizes[featureSizes.length - 1] * 1.2) {
    const cardW = (innerW - cardGap * (features.length - 1)) / features.length;
    const textW = cardW - 2 * (cardPad + cardBorder);
    const fitCard = (f: string, sizes: readonly number[]) => text(f, { sizes, maxWidth: textW, maxLines: 6, lineHeight: 1.2, weight: 600, maxHeight: textMaxHeight });
    // One size for every card, the largest that all of them fit at, so the row reads as a set.
    const shared = Math.min(...features.map((f) => fitCard(f, featureSizes).fontSize));
    features.forEach((f, i) => {
      const x = P + i * (cardW + cardGap);
      const inner = cardPad + cardBorder;
      const number = text(`0${i + 1}`, { sizes: [26], maxWidth: textW, maxLines: 1, lineHeight: 1.2, weight: 700 });
      const body = fitCard(f, [shared]);
      cards.push({ box: { x, y: cardsY, width: cardW, height: cardsH }, number: block(number, x + inner, cardsY + inner), text: block(body, x + inner, cardsY + cardsH - inner - body.height) });
    });
  }
  return finish({ variant: "ph", layout: "type", width: W, height: H, padding: P, mark, name, tagline, domain, features: [], cards, shot: null, badge }, [
    ...(tagline ? [{ id: "tagline", box: tagline.box, layer: "content" as const }] : []),
    ...(domain ? [{ id: "domain", box: domain.box, layer: "content" as const }] : []),
    ...cards.flatMap((card, i) => [
      { id: `card-${i}`, box: card.box, layer: "content" as const },
      { id: `card-${i}-number`, box: card.number.box, layer: "content" as const },
      { id: `card-${i}-text`, box: card.text.box, layer: "content" as const },
    ]),
  ]);
}

export function planKitImage(variant: ImageVariant, content: KitImageContent, media: KitImageMedia = { watermark: false }): KitImagePlan {
  const plan = (() => {
    switch (variant) {
      case "og":
        return planOg(content, media);
      case "x":
        return planX(content, media);
      case "ph":
        return planPh(content, media);
      default: {
        const unreachable: never = variant;
        throw new Error(`Unknown image variant: ${String(unreachable)}`);
      }
    }
  })();
  const { width, height } = IMAGE_VARIANTS[variant];
  if (plan.width !== width || plan.height !== height) throw new Error(`Plan for ${variant} is ${plan.width}×${plan.height}, expected ${width}×${height}`);
  return plan;
}
