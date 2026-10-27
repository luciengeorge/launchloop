import "server-only";
import { z } from "zod";
import type { IngestResult } from "./ingest";
import { COMMIT_SAMPLE, type RepoData } from "./ingest/github";
import { sanitizeGenerated } from "./dashes";
import { LlmError, NO_DASHES_RULE, OUTPUT_TOKENS, generateStructured } from "./llm";
import { pricingProofPoint } from "./prices";
import { briefSchema, type Brief } from "./schema";
import { detectStack } from "./stack";

const DAY_MS = 86_400_000;

/** Commit cadence from the sample we read. When every sampled commit is recent, the sample is the cap, so say that rather than claim a total. */
function commitCadence(commits: RepoData["commits"]): string | undefined {
  const times = commits.map((c) => Date.parse(c.date)).filter(Number.isFinite);
  if (!times.length) return undefined;
  const newest = times[0];
  const recent = times.filter((t) => newest - t <= 30 * DAY_MS);
  if (recent.length < 3) return undefined;
  if (recent.length === times.length && times.length >= COMMIT_SAMPLE) {
    const days = Math.max(1, Math.ceil((newest - recent[recent.length - 1]) / DAY_MS));
    return `Last ${times.length} commits all landed within ${days} day${days === 1 ? "" : "s"}`;
  }
  return `${recent.length} commits in the last month`;
}

const prettify = (slug: string) => {
  const bare = slug.replace(/^@[^/]+\//, "");
  if (/^[\w-]+\.(com|app|dev|io|ai|so|co|sh|xyz)$/i.test(bare)) return bare[0].toUpperCase() + bare.slice(1);
  return bare
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
};

const GENERIC_PACKAGE = /(vite|react|next|starter|template|monorepo|workspace|boilerplate|shadcn|^app$|^web$|^site$|^frontend$|^client$|^root$|my-app)/i;
const plausibleName = (n: string | undefined): n is string =>
  !!n && n.length >= 2 && n.length <= 30 && n.split(/\s+/).length <= 4 && /^[\p{L}\p{N}]/u.test(n) && !/[:?!,]$/.test(n);

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_`>#]/g, "")
    .trim();
}

function readmeSection(readme: string, heading: RegExp): string | undefined {
  const lines = readme.split("\n");
  const start = lines.findIndex((l) => /^#{1,3}\s/.test(l) && heading.test(l));
  if (start < 0) return undefined;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{1,3}\s/.test(l));
  return rest.slice(0, end < 0 ? undefined : end).join("\n").trim();
}

const SETUP_STEP = /^(install|run|clone|execute|create|copy|replace|set ?up|configure|open|cd|npm|npx|yarn|pnpm|bun|deploy|start|go to|navigate|visit|sign up|fork|edit|rename)\b/i;

const bullets = (md: string | undefined) =>
  (md ?? "")
    .split("\n")
    .map((l) => l.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/)?.[1])
    .filter((l): l is string => !!l && !/`/.test(l))
    .map((l) => stripMarkdown(l).replace(/[,;:.]+$/, "").trim())
    .filter((l) => l.length > 8 && l.length < 200 && l.split(/\s+/).length >= 3 && !/^https?:/.test(l) && !SETUP_STEP.test(l) && !/\[[ x]\]/i.test(l));

function firstParagraph(md: string | undefined): string | undefined {
  if (!md) return undefined;
  return md
    .split(/\n\s*\n/)
    .map((p) => stripMarkdown(p).replace(/\s+/g, " "))
    .find((p) => p.length > 40 && !/^(\[!|badge|npm|build)/i.test(p));
}

/** "40 screenshots", "11k", "3x faster", "in 4 minutes". Version numbers and years don't count. */
const STAT_RE = /\b\d[\d,.]*\s?(k|m|%|x)(?![a-z])|\b\d[\d,]+\s+[a-z]+s\b|\b\d+\s?(ms|seconds?|minutes?|hours?|days?|weeks?)\b/i;

const stems = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []).map((w) => w.slice(0, 3)));

function dedupeFeatures(items: string[]): string[] {
  const kept: { text: string; words: Set<string> }[] = [];
  for (const text of items) {
    const w = stems(text);
    const duplicate = kept.some((k) => {
      const shared = [...w].filter((x) => k.words.has(x)).length;
      return shared / Math.max(1, Math.min(w.size, k.words.size)) >= 0.6;
    });
    if (!duplicate) kept.push({ text, words: w });
  }
  return kept.map((k) => k.text);
}

/** Placeholder when no source names the product. Never shown as the brief's name in production. */
const UNKNOWN_NAME = "Your app";

export interface Facts {
  name: string;
  oneLiner?: string;
  problem?: string;
  features: string[];
  proofPoints: string[];
  stack: string[];
  url?: string;
  repoUrl?: string;
  topics: string[];
}

/** Deterministic facts pulled straight from the sources. Copy may only cite numbers from here. */
const CHORE_COMMIT = /^(chore|docs?|ci|build|test|style|refactor|bump|deps|merge|revert|wip|lint|format)\b|^Merge (pull request|branch)|^(update|bump) (readme|deps|dependencies)/i;

export function extractFacts({ repo, site, primary }: IngestResult): Facts {
  const stack = detectStack(repo);

  const readme = repo?.readme;
  const readmeTop = readme?.split("\n").filter((l) => l.trim()).slice(0, 12).join("\n");
  const readmeTitle = readmeTop?.match(/^#\s+(.+)$/m)?.[1] ?? readmeTop?.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1];
  const siteName = site?.siteName?.split(/\s[|·:–—-]\s/)[0].trim();
  const siteTitle = site?.title?.split(/\s[|·:–—-]\s/)[0].trim();
  const pkgName = repo?.packageJson?.name && !GENERIC_PACKAGE.test(repo.packageJson.name) ? prettify(repo.packageJson.name) : undefined;
  const repoName = repo ? prettify(repo.name) : undefined;
  const candidates =
    primary === "site"
      ? [siteName, siteTitle, readmeTitle && stripMarkdown(readmeTitle), pkgName, repoName]
      : [readmeTitle && stripMarkdown(readmeTitle), pkgName, repoName, siteName, siteTitle];
  const name = candidates.find(plausibleName) ?? UNKNOWN_NAME;

  const featureSection = readme ? readmeSection(readme, /feature|what it does|highlights/i) : undefined;
  const repoFeatures = featureSection ? bullets(featureSection) : bullets(readme);
  const siteFeatures = [...(site?.listItems ?? []), ...(site?.headings ?? []).filter((h) => h.length >= 16)].filter((l) => !SETUP_STEP.test(l));
  const features = primary === "site" ? [...siteFeatures, ...repoFeatures] : [...repoFeatures, ...siteFeatures];

  const proofPoints: string[] = [];
  if (repo?.stars && repo.stars >= 10) proofPoints.push(`${repo.stars.toLocaleString("en-GB")} GitHub stars`);
  if (repo?.commits.length) {
    const cadence = commitCadence(repo.commits);
    if (cadence) proofPoints.push(cadence);
    const latest = repo.commits.find((c) => !CHORE_COMMIT.test(c.message));
    if (latest) proofPoints.push(`Latest ship: ${latest.message.replace(/\s*\(#\d+\)$/, "")}`);
  }
  for (const sentence of (readme ? stripMarkdown(readme) : "").split(/\n+|(?<=[.!?])\s+/)) {
    if (proofPoints.length >= 5) break;
    const cleaned = sentence.replace(/^[-*+]\s+/, "").replace(/\s+/g, " ").trim();
    if (STAT_RE.test(cleaned) && cleaned.length < 160) {
      proofPoints.push(cleaned);
    }
  }
  if (repo?.license) proofPoints.push(`Open source (${repo.license})`);
  const pricing = pricingProofPoint(site?.prices ?? []);
  if (pricing) proofPoints.push(pricing);

  const problem = firstParagraph(readme ? readmeSection(readme, /why|problem|motivation/i) : undefined)?.split(/(?<=[.!?])\s+/)[0];

  return {
    name,
    oneLiner: (primary === "site" ? site?.description ?? repo?.description : repo?.description ?? site?.description) ?? firstParagraph(readme),
    problem,
    features: dedupeFeatures(features).slice(0, 6),
    proofPoints: proofPoints.filter((p) => p !== problem).slice(0, 6),
    stack: stack.slice(0, 8),
    url: site?.url ?? repo?.homepage,
    repoUrl: repo?.url,
    topics: repo?.topics ?? repo?.packageJson?.keywords ?? [],
  };
}

/** Compact text digest of everything we read, used as grounding in prompts. */
export function sourceDigest({ repo, site }: IngestResult, maxReadme = 6000): string {
  const parts: string[] = [];
  if (repo) {
    parts.push(`GITHUB REPO: ${repo.url}`);
    if (repo.description) parts.push(`Description: ${repo.description}`);
    if (repo.topics.length) parts.push(`Topics: ${repo.topics.join(", ")}`);
    if (repo.stars !== undefined) parts.push(`Stars: ${repo.stars}`);
    if (repo.packageJson) {
      const deps = Object.keys(repo.packageJson.dependencies ?? {});
      const devDeps = Object.keys(repo.packageJson.devDependencies ?? {});
      parts.push(
        `package.json name: ${repo.packageJson.name ?? "-"}; description: ${repo.packageJson.description ?? "-"}; dependencies: ${deps.slice(0, 40).join(", ") || "-"}; devDependencies (build and test tooling): ${devDeps.slice(0, 20).join(", ") || "-"}`,
      );
    }
    if (repo.commits.length) parts.push(`Recent commits:\n${repo.commits.slice(0, 15).map((c) => `- ${c.date.slice(0, 10)} ${c.message}`).join("\n")}`);
    if (repo.readme) parts.push(`README:\n${repo.readme.slice(0, maxReadme)}`);
  }
  if (site) {
    parts.push(`LIVE PAGE: ${site.url}`);
    for (const [label, value] of [
      ["Title", site.title],
      ["Meta description", site.description],
      ["H1", site.h1],
      ["Headings", site.headings.join(" | ")],
      ["Paragraphs", site.paragraphs.slice(0, 6).join("\n")],
      ["List items", site.listItems.join(" | ")],
      ["Prices", site.prices.join(", ")],
    ] as const) {
      if (value) parts.push(`${label}: ${value}`);
    }
  }
  return parts.join("\n\n");
}

const llmBriefSchema = briefSchema.pick({ name: true, oneLiner: true, audience: true, problem: true, features: true, tone: true });

const BRIEF_TEXT_FIELDS = ["name", "oneLiner", "audience", "problem", "tone"] as const;

function briefRubric(value: z.infer<typeof llmBriefSchema>): string[] {
  const problems: string[] = BRIEF_TEXT_FIELDS.filter((k) => !value[k]?.trim()).map((k) => `${k} is empty; fill it from the material.`);
  if (!value.features.some((f) => f.trim())) problems.push("features is empty; list 3-6 features that the material describes.");
  return problems;
}

/** Template brief for mock mode (local dev and tests) only. */
function heuristicBrief(facts: Facts): Brief {
  const features = facts.features.length ? facts.features : [facts.oneLiner ?? `${facts.name} does one job well`];
  return {
    name: facts.name,
    oneLiner: facts.oneLiner ?? `${facts.name} helps you get more done with less fuss.`,
    audience: facts.topics.some((t) => /dev|api|cli|sdk|code/i.test(t)) ? "developers and technical founders" : "indie makers and small teams",
    problem: facts.problem ?? `Doing this by hand is slow and easy to get wrong, and existing tools are built for bigger teams.`,
    features: features.slice(0, 6),
    proofPoints: facts.proofPoints,
    stack: facts.stack,
    tone: "friendly, specific, no hype",
    url: facts.url,
    repoUrl: facts.repoUrl,
  };
}

export async function buildBrief(source: IngestResult): Promise<{ brief: Brief; provider: string }> {
  const facts = extractFacts(source);
  const { value, provider } = await generateStructured<z.infer<typeof llmBriefSchema>>({
    schema: llmBriefSchema,
    system:
      `You turn raw repository and website material into a short, factual product brief for launch copy. Use only what the material says. If something is unknown, write a cautious, generic statement instead of inventing specifics. ${NO_DASHES_RULE} Return JSON.`,
    user: `Write a product brief as JSON with keys: name (product name, max 30 chars), oneLiner (max 140 chars, what it does and for whom), audience (who it is for), problem (1-2 sentences, the pain it removes), features (3-6 short concrete features actually present in the material, max 120 chars each), tone (3-6 words describing the maker's voice, inferred from the README).\n\nDetected facts: ${JSON.stringify(facts)}\n\nSource material:\n${sourceDigest(source)}`,
    mock: () => heuristicBrief(facts),
    rubric: briefRubric,
    maxOutputTokens: OUTPUT_TOKENS.brief,
    stage: "brief",
  });
  // A field the model still left empty may come from the source itself, never from canned text.
  const fromSource: Record<(typeof BRIEF_TEXT_FIELDS)[number], string> = {
    name: facts.name === UNKNOWN_NAME ? "" : facts.name,
    oneLiner: facts.oneLiner ?? "",
    problem: facts.problem ?? "",
    audience: "",
    tone: "",
  };
  const text = Object.fromEntries(BRIEF_TEXT_FIELDS.map((k) => [k, value[k]?.trim() || fromSource[k]])) as Record<(typeof BRIEF_TEXT_FIELDS)[number], string>;
  const llmFeatures = value.features.map((f) => f.trim()).filter(Boolean);
  const features = (llmFeatures.length ? llmFeatures : facts.features).slice(0, 6);
  const missing = [...BRIEF_TEXT_FIELDS.filter((k) => !text[k]), ...(features.length ? [] : ["features"])];
  if (missing.length) throw new LlmError(`The brief is still missing ${missing.join(", ")} after every attempt`);
  // The model's fields are already clean; text taken straight from the source (fallbacks, proof points) may not be.
  return {
    brief: sanitizeGenerated({ ...text, features, proofPoints: facts.proofPoints, stack: facts.stack, url: facts.url, repoUrl: facts.repoUrl }),
    provider,
  };
}
