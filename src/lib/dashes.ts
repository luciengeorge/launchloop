/**
 * Generated copy must not use dashes (figure ‒, en –, em —, horizontal bar ―) as punctuation. Models reach for them
 * anyway, so every generated text field passes through here.
 *
 * - URLs and `code spans` are set aside first and come back untouched.
 * - A number range keeps its meaning with a plain hyphen: 2–3, 10–20%, $5–$10, 2020–2024 (en dash, or any dash unspaced).
 * - An en or figure dash next to a token with a digit in it is a range too, and keeps its spacing: "Jan 5 – Feb 3",
 *   "9am – 5pm". An em dash there is still punctuation ("Day 1—shipped it" reads "Day 1, shipped it").
 * - An en or figure dash joining two words with no spaces is a compound (client–server, Mon‒Fri) and becomes a hyphen.
 * - A dash at the start of a line is a list marker and becomes "- ".
 * - Two or more dashes in one sentence set off an aside, so each becomes a comma.
 * - A single dash becomes a colon when the words after it explain the ones before (three or more words, not starting
 *   with a conjunction), otherwise a comma. A sentence that already has a colon gets a comma instead.
 * - A dash with nothing after it is dropped.
 * Plain hyphens (well-known, self-hosted) and the minus sign (−) are never touched, and neither is any whitespace the
 * replacement doesn't consume (indentation, aligned columns).
 *
 * Every repetition is bounded, so a long run of digits or spaces can't make a pattern backtrack quadratically.
 */
const DASH_CHARS = "\\u2012-\\u2015";
const DASH = `[${DASH_CHARS}]`;
const HAS_DASH = new RegExp(DASH);
// An en dash (spaced or not) or any unspaced dash between numbers; a spaced em dash there is handled as a token range.
const RANGE = new RegExp(`(\\d[\\d.,]{0,20}%?)(?:[ \\t]{0,8}\\u2013[ \\t]{0,8}|${DASH})([$£€]?\\d)`, "g");
// An en or figure dash (the range dashes) with a digit in the token just before or just after it. The after token is
// only looked at, not consumed. Em dashes and bars next to a digit ("Day 1—shipped it") stay punctuation.
const TOKEN_RANGE = new RegExp(`([^\\s${DASH_CHARS}]{0,40})([ \\t]{0,8})[\\u2012\\u2013]([ \\t]{0,8})(?=([^\\s${DASH_CHARS}]{0,40}))`, "g");
const COMPOUND = /([\p{L}\p{N}])[\u2012\u2013]([\p{L}\p{N}])/gu;
const LIST_MARKER = new RegExp(`^([ \\t]{0,8})${DASH}+[ \\t]{0,8}`, "gm");
const PUNCTUATION_DASH = new RegExp(`[ \\t]{0,8}${DASH}+[ \\t]{0,8}`, "g");
const CONNECTORS = /^(and|but|or|so|yet|nor|then|which|who|whose|because|while|plus|with|without|though|although|if|when|not)\b/i;
/** URLs and `code spans` are swapped for one private-use character each while dashes are replaced. */
const PROTECTED = /https?:\/\/\S+|`[^`\n]*`/g;
const PLACEHOLDER_BASE = 0xe100;
const PLACEHOLDER = /[\ue100-\uf8ff]/g;
const HAS_PLACEHOLDER_CHAR = /[\ue100-\uf8ff]/;

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
    if (!out.trim() || /[,:;(.!?]$/.test(out)) {
      out += (out.trim() ? " " : "") + next;
      continue;
    }
    const words = next.replace(/[.!?]+$/, "").trim().split(/\s+/).length;
    const colon = !aside && !out.includes(":") && words >= 3 && !CONNECTORS.test(next);
    out += `${colon ? ":" : ","} ${next}`;
  }
  return out;
}

/** Removes dash punctuation from one piece of generated copy. Deterministic; plain hyphens and other whitespace are kept. */
export function sanitizeDashes(text: string): string {
  if (!HAS_DASH.test(text)) return text;
  const kept: string[] = [];
  // Text that already holds placeholder characters is left unshielded rather than risk restoring the wrong thing.
  const shielded = HAS_PLACEHOLDER_CHAR.test(text) ? text : text.replace(PROTECTED, (match) => String.fromCharCode(PLACEHOLDER_BASE + kept.push(match) - 1));
  const prepared = shielded
    .replace(LIST_MARKER, "$1- ")
    .replace(RANGE, "$1-$2")
    .replace(TOKEN_RANGE, (match, before: string, spaceBefore: string, spaceAfter: string, after: string) =>
      /\d/.test(before) || /\d/.test(after) ? `${before}${spaceBefore || spaceAfter ? " - " : "-"}` : match,
    )
    .replace(COMPOUND, "$1-$2");
  // Sentence by sentence (and line by line), so a pair of dashes is only an aside within one sentence.
  const replaced = prepared
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.!?])(\s+)/)
        .map((piece) => (/^\s+$/.test(piece) ? piece : replaceInSentence(piece)))
        .join(""),
    )
    .join("\n");
  return kept.length ? replaced.replace(PLACEHOLDER, (char) => kept[char.charCodeAt(0) - PLACEHOLDER_BASE] ?? char) : replaced;
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
