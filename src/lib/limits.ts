import { X_TLDS } from "./x-tlds";

/** Platform limits enforced on every generated asset. */
export const LIMITS = {
  phName: 40,
  phTagline: 60,
  phDescription: 260,
  phMakerComment: 1000,
  xPost: 280,
  xThreadMin: 5,
  xThreadMax: 7,
  linkedin: 3000,
  landingHeadline: 80,
  landingSubheadline: 180,
  landingCta: 28,
  featureTitle: 40,
  featureDescription: 160,
  metaTitle: 60,
  metaDescription: 155,
} as const;

const X_URL_WEIGHT = 23;

/*
 * Link detection ported from twitter-text v3.1.0 (Apache-2.0), extractUrlsWithIndices: X wraps every link it detects in t.co,
 * including bare domains such as launchloop.dev, as long as the domain ends in a TLD it knows.
 */
const LATIN_ACCENTS = String.raw`\xC0-\xD6\xD8-\xF6\xF8-\xFF\u0100-\u024F\u0253\u0254\u0256\u0257\u0259\u025B\u0263\u0268\u026F\u0272\u0289\u028B\u02BB\u0300-\u036F\u1E00-\u1EFF`;
const CYRILLIC = String.raw`\u0400-\u04FF`;
const DIRECTIONAL = String.raw`\u202A-\u202E\u061C\u200E\u200F\u2066-\u2069`;
const INVALID = String.raw`\uFFFE\uFEFF\uFFFF`;
const SPACES = String.raw`\x09-\x0D\x20\x85\xA0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000`;
const PUNCT = String.raw`!'#%&()*+,\\\-./:;<=>?@\[\]^_{|}~$`;
const DOMAIN_CHAR = `[^${PUNCT}${SPACES}${INVALID}${DIRECTIONAL}]`;
const TLD = String.raw`(?:${X_TLDS.join("|")}|xn--[\-0-9a-z]+)(?=[^0-9a-zA-Z@+-]|$)`;
const DOMAIN = `(?:(?:${DOMAIN_CHAR}(?:[_-]|${DOMAIN_CHAR})*)?${DOMAIN_CHAR}\\.)*(?:(?:${DOMAIN_CHAR}(?:-|${DOMAIN_CHAR})*)?${DOMAIN_CHAR}\\.)${TLD}`;
const PATH_CHAR = String.raw`[a-z${CYRILLIC}0-9!*';:=+,.$/%#\[\]\-\u2013_~@|&${LATIN_ACCENTS}]`;
const PARENS = String.raw`\((?:${PATH_CHAR}+|(?:${PATH_CHAR}*\(${PATH_CHAR}+\)${PATH_CHAR}*))\)`;
const PATH_END = String.raw`(?:[+\-a-z${CYRILLIC}0-9=_#/${LATIN_ACCENTS}]|${PARENS})`;
const PATH = `(?:(?:${PATH_CHAR}*(?:${PARENS}${PATH_CHAR}*)*${PATH_END})|(?:@${PATH_CHAR}+/))`;
const QUERY_CHARS = String.raw`[a-z0-9!?*'@();:&=+$/%#\[\]\-_.,~|]`;
const QUERY_END = String.raw`[a-z0-9\-_&=#/]`;
const URL_RE = new RegExp(
  String.raw`(^|[^A-Za-z0-9@＠$#＃${INVALID}]|[${DIRECTIONAL}])((https?:\/\/)?(${DOMAIN})(?::[0-9]+)?(\/${PATH}*)?(?:\?${QUERY_CHARS}*${QUERY_END})?)`,
  "gi",
);
const ASCII_DOMAIN = new RegExp(String.raw`(?:[\-a-z0-9${LATIN_ACCENTS}]+\.)+${TLD}`, "gi");
const TCO_URL = new RegExp(String.raw`^https?:\/\/t\.co\/([a-z0-9]+)(?:\?${QUERY_CHARS}*${QUERY_END})?`, "i");

/** [start, end) UTF-16 ranges of the links X would count as 23 characters each. */
function xUrlRanges(text: string): [number, number][] {
  if (!text.includes(".")) return [];
  const ranges: [number, number][] = [];
  for (const m of text.matchAll(URL_RE)) {
    const [, before, url, protocol, domain, path] = m;
    const start = m.index + before.length;
    if ((protocol ?? "https://").length + url.length > 4096) continue;
    if (protocol) {
      const tco = TCO_URL.exec(url);
      if (tco && tco[1].length > 40) continue;
      ranges.push([start, start + (tco ? tco[0].length : url.length)]);
      continue;
    }
    if (/[-_./]$/.test(before)) continue;
    let last: [number, number] | undefined;
    for (const a of domain.matchAll(ASCII_DOMAIN)) {
      last = [start + a.index, start + a.index + a[0].length];
      ranges.push(last);
    }
    if (last && path) last[1] = start + url.length;
  }
  return ranges;
}

/**
 * X's weighted length (twitter-text v3): every link counts as 23, Latin and common punctuation count 1,
 * everything else (CJK, emoji) counts 2. Emoji sequences (ZWJ, skin tones, variation selectors) count 2 per code point, where X counts 2 per
 * emoji, so they can only overcount.
 */
export function xLength(text: string): number {
  const normalized = text.normalize("NFC");
  let length = 0;
  let i = 0;
  for (const [start, end] of xUrlRanges(normalized)) {
    length += plainXLength(normalized.slice(i, start)) + X_URL_WEIGHT;
    i = end;
  }
  return length + plainXLength(normalized.slice(i));
}

function plainXLength(text: string): number {
  let length = 0;
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    const light =
      (cp >= 0x0000 && cp <= 0x10ff) ||
      (cp >= 0x2000 && cp <= 0x200d) ||
      (cp >= 0x2010 && cp <= 0x201f) ||
      (cp >= 0x2032 && cp <= 0x2037);
    length += light ? 1 : 2;
  }
  return length;
}

export const charLength = (text: string) => Array.from(text).length;

/** Truncates at a word boundary so the result (including the ellipsis) fits the limit. */
export function fitToLimit(text: string, limit: number, measure: (t: string) => number = charLength): string {
  const clean = text.trim();
  if (measure(clean) <= limit) return clean;
  const words = clean.split(/(\s+)/);
  let out = "";
  for (const word of words) {
    if (measure(`${out}${word}…`) > limit) break;
    out += word;
  }
  out = out.trimEnd().replace(/[,;:\-–—]+$/, "");
  if (!out) out = Array.from(clean).slice(0, Math.max(0, limit - 1)).join("");
  return `${out}…`;
}

const VOTE_PATTERNS: RegExp[] = [
  /\bup-?vot(e|es|ed|ing)\b/i,
  /\bvot(e|es|ing)\s+(for|on)\s+(us|me|our|my|it|this)\b/i,
  /\b(please|pls|plz|kindly)\b[^.!?\n]{0,40}\bvote\b/i,
  /\b(cast|leave|drop|give)\b[^.!?\n]{0,20}\bvotes?\b/i,
  /\b(support|back)\s+us\s+on\s+(product\s*hunt|ph|hacker\s*news|hn)\b/i,
  /\bhunt\s+(us|me)\b/i,
  /\bsmash\s+(that|the)\b/i,
  /\b(show|send|give)\s+(us\s+)?(some\s+)?love\s+on\s+(product\s*hunt|ph)\b/i,
  /\bhelp\s+us\s+(get\s+to|reach|hit|become)\s+(#\s?1|the\s+top|number\s+one|product\s+of\s+the\s+day)\b/i,
  /\b(product|#1 product)\s+of\s+the\s+day\b[^.!?\n]{0,40}\b(help|need|support)\b/i,
];

export function containsVoteBegging(text: string): boolean {
  return VOTE_PATTERNS.some((re) => re.test(text));
}

/** Removes any sentence or line that solicits votes, keeping the rest intact. */
export function stripVoteBegging(text: string): string {
  if (!containsVoteBegging(text)) return text;
  return text
    .split("\n")
    .map((line) => {
      if (!containsVoteBegging(line)) return line;
      const sentences = line.match(/[^.!?]+[.!?]*\s*/g) ?? [line];
      return sentences.filter((s) => !containsVoteBegging(s)).join("").trimEnd();
    })
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n")
    .trim();
}
