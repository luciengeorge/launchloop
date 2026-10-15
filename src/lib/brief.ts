import "server-only";
import { z } from "zod";
import type { IngestResult } from "./ingest";
import { generateStructured } from "./llm";
import { briefSchema, type Brief } from "./schema";

const STACK_MAP: Record<string, string> = {
  next: "Next.js",
  react: "React",
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit",
  astro: "Astro",
  vite: "Vite",
  "@remix-run/react": "Remix",
  tailwindcss: "Tailwind CSS",
  "@supabase/supabase-js": "Supabase",
  convex: "Convex",
  firebase: "Firebase",
  prisma: "Prisma",
  "@prisma/client": "Prisma",
  "drizzle-orm": "Drizzle",
  stripe: "Stripe",
  openai: "OpenAI",
  "@anthropic-ai/sdk": "Anthropic",
  ai: "Vercel AI SDK",
  "@clerk/nextjs": "Clerk",
  "next-auth": "Auth.js",
  "better-auth": "Better Auth",
  "tesseract.js": "Tesseract.js",
  "three": "Three.js",
  expo: "Expo",
  "react-native": "React Native",
  electron: "Electron",
  "@tauri-apps/api": "Tauri",
  hono: "Hono",
  express: "Express",
};

const prettify = (slug: string) =>
  slug
    .replace(/^@[^/]+\//, "")
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

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

const bullets = (md: string | undefined) =>
  (md ?? "")
    .split("\n")
    .map((l) => l.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/)?.[1])
    .filter((l): l is string => !!l)
    .map((l) => stripMarkdown(l))
    .filter((l) => l.length > 8 && l.length < 200 && !/^https?:/.test(l));

function firstParagraph(md: string | undefined): string | undefined {
  if (!md) return undefined;
  return md
    .split(/\n\s*\n/)
    .map((p) => stripMarkdown(p).replace(/\s+/g, " "))
    .find((p) => p.length > 40 && !/^(\[!|badge|npm|build)/i.test(p));
}

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
export function extractFacts({ repo, site }: IngestResult): Facts {
  const deps = { ...repo?.packageJson?.dependencies, ...repo?.packageJson?.devDependencies };
  const stack = [...new Set(Object.keys(deps).map((d) => STACK_MAP[d]).filter(Boolean))];
  if (stack.length === 0 && repo?.language) stack.push(repo.language);

  const readme = repo?.readme;
  const readmeTitle = readme?.match(/^#\s+(.+)$/m)?.[1];
  const siteName = site?.siteName && site.siteName.length <= 30 ? site.siteName : undefined;
  const name =
    siteName ??
    (readmeTitle && readmeTitle.length <= 30 ? stripMarkdown(readmeTitle) : undefined) ??
    (repo?.packageJson?.name ? prettify(repo.packageJson.name) : undefined) ??
    (repo ? prettify(repo.name) : undefined) ??
    site?.title?.split(/[|:–—-]/)[0].trim() ??
    "Your app";

  const features = [
    ...bullets(readme ? readmeSection(readme, /feature|what it does|highlights/i) : undefined),
    ...bullets(readme),
    ...(site?.listItems ?? []),
    ...(site?.headings ?? []),
  ];

  const proofPoints: string[] = [];
  if (repo?.stars && repo.stars >= 10) proofPoints.push(`${repo.stars.toLocaleString("en-GB")} GitHub stars`);
  if (repo?.commits.length) {
    const newest = Date.parse(repo.commits[0].date);
    const recent = repo.commits.filter((c) => newest - Date.parse(c.date) <= 30 * 86_400_000).length;
    if (recent >= 3) proofPoints.push(`${recent}${recent === 20 ? "+" : ""} commits in the last month`);
    proofPoints.push(`Latest ship: ${repo.commits[0].message}`);
  }
  for (const sentence of (readme ? stripMarkdown(readme) : "").split(/(?<=[.!?])\s+/)) {
    if (proofPoints.length >= 5) break;
    if (/\b\d[\d,.]*\s?(k|%|x|ms|seconds?|minutes?|users?|screenshots?|files?|downloads?)\b/i.test(sentence) && sentence.length < 160) {
      proofPoints.push(sentence.replace(/\s+/g, " ").trim());
    }
  }
  if (repo?.license) proofPoints.push(`Open source (${repo.license})`);
  if (site?.prices.length) proofPoints.push(`Pricing on site: ${site.prices.join(", ")}`);

  return {
    name,
    oneLiner: repo?.description ?? site?.description ?? firstParagraph(readme),
    problem: firstParagraph(readme ? readmeSection(readme, /why|problem|motivation/i) : undefined),
    features: [...new Set(features)].slice(0, 6),
    proofPoints: proofPoints.slice(0, 6),
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
      const deps = Object.keys({ ...repo.packageJson.dependencies, ...repo.packageJson.devDependencies });
      parts.push(`package.json name: ${repo.packageJson.name ?? "-"}; description: ${repo.packageJson.description ?? "-"}; dependencies: ${deps.slice(0, 40).join(", ")}`);
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
  const fallback = heuristicBrief(facts);
  const { value, provider } = await generateStructured<z.infer<typeof llmBriefSchema>>({
    schema: llmBriefSchema,
    system:
      "You turn raw repository and website material into a short, factual product brief for launch copy. Use only what the material says. If something is unknown, write a cautious, generic statement instead of inventing specifics. Return JSON.",
    user: `Write a product brief as JSON with keys: name (product name, max 30 chars), oneLiner (max 140 chars, what it does and for whom), audience (who it is for), problem (1-2 sentences, the pain it removes), features (3-6 short concrete features actually present in the material, max 120 chars each), tone (3-6 words describing the maker's voice, inferred from the README).\n\nDetected facts: ${JSON.stringify(facts)}\n\nSource material:\n${sourceDigest(source)}`,
    mock: () => fallback,
  });
  return {
    brief: {
      ...fallback,
      ...value,
      features: value.features.slice(0, 6),
      proofPoints: facts.proofPoints,
      stack: facts.stack,
      url: facts.url,
      repoUrl: facts.repoUrl,
    },
    provider,
  };
}
