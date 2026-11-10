/**
 * Generated copy must not use dashes (figure ‒, en –, em —, horizontal bar ―) as punctuation. Models reach for them
 * anyway, so every generated text field passes through here.
 *
 * - URLs and `code spans` are set aside first and come back untouched. A URL never ends in a dash: one right after it
 *   is punctuation.
 * - A number range keeps its meaning with a plain hyphen: 2–3, 10–20%, $5–$10, 2020–2024 (en dash, or any dash unspaced).
 * - An en or figure dash with a digit within a word of it on both sides is a range too, and keeps its spacing:
 *   "Jan 5 – Feb 3", "9am – 5pm". With a digit on one side only it's punctuation ("Version 2 – the best"), and so is an
 *   em dash next to a digit ("Day 1—shipped it" reads "Day 1, shipped it").
 * - An en or figure dash joining two words with no spaces is a compound (client–server, Mon‒Fri) and becomes a hyphen.
 * - A dash at the start of a line, before some text, is a list marker and becomes "- ".
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
// An en or figure dash (the range dashes) with the one or two tokens on each side of it. The tokens after it are only
// looked at, not consumed. Em dashes and bars next to a digit ("Day 1—shipped it") stay punctuation.
const TOKEN = `[^\\s${DASH_CHARS}]`;
const TOKEN_RANGE = new RegExp(
  `((?:(?:${TOKEN}{1,40}[ \\t]{1,8})?${TOKEN}{1,40})?)([ \\t]{0,8})[\\u2012\\u2013]([ \\t]{0,8})(?=(${TOKEN}{0,40}(?:[ \\t]{1,8}${TOKEN}{1,40})?))`,
  "g",
);
const COMPOUND = /([\p{L}\p{N}])[\u2012\u2013]([\p{L}\p{N}])/gu;
const LIST_MARKER = new RegExp(`^([ \\t]{0,8})${DASH}+[ \\t]{0,8}(?=${TOKEN})`, "gm");
const PUNCTUATION_DASH = new RegExp(`[ \\t]{0,8}${DASH}+[ \\t]{0,8}`, "g");
const CONNECTORS = /^(and|but|or|so|yet|nor|then|which|who|whose|because|while|plus|with|without|though|although|if|when|not)\b/i;
/** URLs and `code spans` are swapped for one private-use character each, not found in the text, while dashes are replaced. */
const PROTECTED = new RegExp(`https?:\\/\\/\\S*[^\\s${DASH_CHARS}]|\`[^\`\\n]*\``, "g");
const PRIVATE_USE = /[\ue000-\uf8ff]/g;

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
  const inText = new Set(text.match(PRIVATE_USE));
  const kept = new Map<string, string>();
  let code = 0xe000;
  const shielded = text.replace(PROTECTED, (match) => {
    while (inText.has(String.fromCharCode(code))) code++;
    const placeholder = String.fromCharCode(code++);
    kept.set(placeholder, match);
    return placeholder;
  });
  const prepared = shielded
    .replace(LIST_MARKER, "$1- ")
    .replace(RANGE, "$1-$2")
    .replace(TOKEN_RANGE, (match, before: string, spaceBefore: string, spaceAfter: string, after: string) =>
      /\d/.test(before) && /\d/.test(after) ? `${before}${spaceBefore || spaceAfter ? " - " : "-"}` : match,
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
  return kept.size ? replaced.replace(PRIVATE_USE, (char) => kept.get(char) ?? char) : replaced;
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
