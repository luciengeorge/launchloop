/**
 * Generated copy must not use em dashes (—) or en dashes (–) as punctuation. Models reach for them anyway, so every
 * generated text field passes through here.
 *
 * - A number range keeps its meaning with a plain hyphen: 2–3, 10–20%, $5–$10, 2020–2024 (en dash, or em dash unspaced).
 * - An en dash joining two words with no spaces is a compound (client–server) and becomes a hyphen.
 * - A dash at the start of a line is a list marker and becomes "- ".
 * - Two or more dashes in one sentence set off an aside, so each becomes a comma.
 * - A single dash becomes a colon when the words after it explain the ones before (three or more words, not starting
 *   with a conjunction), otherwise a comma. A sentence that already has a colon gets a comma instead.
 * - A dash with nothing after it is dropped.
 * Plain hyphens (well-known, self-hosted) are never touched.
 */
const DASH = "[\u2013\u2014]";
// An en dash (spaced or not) or an unspaced em dash between numbers; a spaced em dash there is still punctuation.
const RANGE = /(\d[\d.,]*%?)(?:\s*\u2013\s*|\u2014)([$£€]?\d)/g;
const COMPOUND = /([\p{L}\p{N}])\u2013([\p{L}\p{N}])/gu;
const LIST_MARKER = new RegExp(`^([ \\t]*)${DASH}[ \\t]*`, "gm");
const PUNCTUATION_DASH = new RegExp(`[ \\t]*${DASH}+[ \\t]*`, "g");
const CONNECTORS = /^(and|but|or|so|yet|nor|then|which|who|whose|because|while|plus|with|without|though|although|if|when|not)\b/i;

function replaceInSentence(sentence: string): string {
  const parts = sentence.split(PUNCTUATION_DASH);
  if (parts.length === 1) return sentence;
  const aside = parts.length > 2;
  let out = parts[0].trimEnd();
  for (let i = 1; i < parts.length; i++) {
    const next = parts[i].trimStart();
    if (!next.trim() || /^[.!?,;:)\]]/.test(next)) {
      out += next;
      continue;
    }
    if (!out || /[,:;(.!?]$/.test(out)) {
      out += (out ? " " : "") + next;
      continue;
    }
    const words = next.replace(/[.!?]+$/, "").trim().split(/\s+/).length;
    const colon = !aside && !out.includes(":") && words >= 3 && !CONNECTORS.test(next);
    out += `${colon ? ":" : ","} ${next}`;
  }
  return out;
}

/** Removes em and en dash punctuation from one piece of generated copy. Deterministic; plain hyphens are kept. */
export function sanitizeDashes(text: string): string {
  if (!/[\u2013\u2014]/.test(text)) return text;
  const prepared = text.replace(RANGE, "$1-$2").replace(COMPOUND, "$1-$2").replace(LIST_MARKER, "$1- ");
  // Sentence by sentence (and line by line), so a pair of dashes is only an aside within one sentence.
  return prepared
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.!?])(\s+)/)
        .map((piece) => (/^\s+$/.test(piece) ? piece : replaceInSentence(piece)))
        .join(""),
    )
    .join("\n")
    .replace(/[ \t]{2,}/g, " ");
}

/** Keys that hold URLs or identifiers, never copy. */
const NOT_COPY = new Set(["url", "repoUrl", "siteUrl", "link_url"]);

/** sanitizeDashes on every string in a generated value (objects and arrays, any depth), except URL fields. */
export function sanitizeGenerated<T>(value: T): T {
  if (typeof value === "string") return sanitizeDashes(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeGenerated(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, NOT_COPY.has(key) ? item : sanitizeGenerated(item)])) as T;
  }
  return value;
}
