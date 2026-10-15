import { LIMITS, charLength, containsVoteBegging } from "./limits";

/**
 * Product Hunt tagline rules, shared by the free checker (in the browser) and
 * the tagline generator's rubric (on the server), so generated options always
 * pass the same checks a maker sees.
 */
export const TAGLINE_LIMIT = LIMITS.phTagline;
const SHORT_TAGLINE = 15;

export type CheckStatus = "pass" | "warn" | "fail";

export type CheckId = "length" | "period" | "caps" | "emoji" | "hype" | "name" | "asks";

export interface TaglineCheck {
  id: CheckId;
  status: CheckStatus;
  label: string;
  detail: string;
}

export interface TaglineResult {
  length: number;
  verdict: CheckStatus;
  checks: TaglineCheck[];
}

const HYPE: { label: string; re: RegExp }[] = [
  { label: "AI-powered", re: /\bai[\s-]?powered\b/i },
  { label: "revolutionary", re: /\brevolution(ary|ise|ize|ising|izing)\b/i },
  { label: "ultimate", re: /\bultimate\b/i },
  { label: "seamless", re: /\bseamless(ly)?\b/i },
  { label: "game-changing", re: /\bgame[\s-]?chang(er|ing)\b/i },
  { label: "next-level", re: /\bnext[\s-]level\b/i },
  { label: "cutting-edge", re: /\bcutting[\s-]edge\b/i },
  { label: "supercharge", re: /\bsupercharg(e|es|ed|ing)\b/i },
  { label: "world-class", re: /\bworld[\s-]class\b/i },
  { label: "best-in-class", re: /\bbest[\s-]in[\s-]class\b/i },
  { label: "unleash", re: /\bunleash(es|ed|ing)?\b/i },
];

const EMOJI = /(?![©®™])\p{Extended_Pictographic}/u;
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const hypeWords = (text: string) => HYPE.filter((h) => h.re.test(text)).map((h) => h.label);

export function isAllCaps(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 6) return false;
  const upper = letters.filter((l) => l !== l.toLowerCase() && l === l.toUpperCase()).length;
  return upper / letters.length >= 0.8;
}

export function repeatsName(tagline: string, name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(n)}($|[^\\p{L}\\p{N}])`, "iu").test(tagline);
}

function lengthCheck(length: number): TaglineCheck {
  if (length === 0) return { id: "length", status: "fail", label: "Write a tagline", detail: `Type or paste your tagline. Product Hunt allows up to ${TAGLINE_LIMIT} characters.` };
  if (length > TAGLINE_LIMIT) {
    const over = length - TAGLINE_LIMIT;
    return { id: "length", status: "fail", label: `${length} characters: ${over} over the limit`, detail: `Product Hunt stops at ${TAGLINE_LIMIT} characters, spaces included. Cut ${over} to fit.` };
  }
  if (length < SHORT_TAGLINE) return { id: "length", status: "warn", label: "Very short", detail: "Fits, but there's room to say what it does and who it's for." };
  return { id: "length", status: "pass", label: `Fits in ${TAGLINE_LIMIT} characters`, detail: `${TAGLINE_LIMIT - length} characters to spare.` };
}

/** Runs every check. `name` is optional; without it the name check is skipped. */
export function checkTagline(raw: string, name = ""): TaglineResult {
  const tagline = raw.trim();
  const length = charLength(tagline);
  const checks: TaglineCheck[] = [lengthCheck(length)];

  if (length > 0) {
    const hype = hypeWords(tagline);
    checks.push(
      /\.\s*$/.test(tagline)
        ? { id: "period", status: "warn", label: "Ends with a full stop", detail: "Taglines read as labels in the feed. Drop the trailing period." }
        : { id: "period", status: "pass", label: "No trailing full stop", detail: "Reads cleanly as a label." },
      isAllCaps(tagline)
        ? { id: "caps", status: "warn", label: "Written in capitals", detail: "All caps reads as shouting and is harder to scan. Use sentence case." }
        : { id: "caps", status: "pass", label: "Not in all caps", detail: "Sentence case is easiest to read in the feed." },
      EMOJI.test(tagline)
        ? { id: "emoji", status: "warn", label: "Contains emoji", detail: "Emoji take space and say nothing about the product. Save them for the maker comment." }
        : { id: "emoji", status: "pass", label: "No emoji", detail: "Every character is doing work." },
      hype.length
        ? { id: "hype", status: "warn", label: `Vague hype: ${hype.map((h) => `“${h}”`).join(", ")}`, detail: "Half the feed says this. Replace it with the outcome you deliver and who gets it." }
        : { id: "hype", status: "pass", label: "No vague hype words", detail: "Plain words beat buzzwords." },
    );
    if (name.trim()) {
      checks.push(
        repeatsName(tagline, name)
          ? { id: "name", status: "warn", label: "Repeats the product name", detail: "Product Hunt shows your name right above the tagline. Use those characters to say what it does." }
          : { id: "name", status: "pass", label: "Doesn't repeat the product name", detail: "The name is already shown above it." },
      );
    }
    if (containsVoteBegging(tagline)) {
      checks.push({ id: "asks", status: "fail", label: "Asks for support", detail: "Product Hunt's rules don't allow asking for support in a listing. Describe the product instead." });
    }
  }

  const verdict: CheckStatus = checks.some((c) => c.status === "fail") ? "fail" : checks.some((c) => c.status === "warn") ? "warn" : "pass";
  return { length, verdict, checks };
}

/** Rubric form for the generator: every non-passing check as a problem the model can fix. */
export function taglineProblems(tagline: string, name: string, label = "tagline"): string[] {
  return checkTagline(tagline, name)
    .checks.filter((c) => c.status !== "pass")
    .map((c) => `${label}: ${c.label}. ${c.detail}`);
}
