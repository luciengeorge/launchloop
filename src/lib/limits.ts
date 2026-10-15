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

const URL_RE = /https?:\/\/[^\s]+/g;
const X_URL_WEIGHT = 23;

/**
 * Approximates X's weighted length (twitter-text v3): URLs count as 23,
 * Latin and common punctuation count 1, everything else (CJK, emoji) counts 2.
 */
export function xLength(text: string): number {
  let length = 0;
  const withoutUrls = text.replace(URL_RE, () => {
    length += X_URL_WEIGHT;
    return "";
  });
  for (const char of withoutUrls.normalize("NFC")) {
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
