import "server-only";
import { LIMITS, charLength, containsVoteBegging, fitToLimit, stripVoteBegging, xLength } from "./limits";
import { LlmError, NO_DASHES_RULE, OUTPUT_TOKENS, generateStructured } from "./llm";
import { z } from "zod";
import { kitContentSchema, previewSchema, type Brief, type KitContent, type KitSection, type Preview } from "./schema";
import { checkTagline, taglineProblems } from "./tagline-check";

const BANNED_PHRASES = [
  "revolutioniz",
  "revolutionis",
  "game-changer",
  "game changer",
  "supercharge",
  "seamless",
  "leverage",
  "fast-paced world",
  "unleash",
  "next-level",
  "cutting-edge",
];

const SYSTEM = `You are LaunchLoop, a launch copywriter for indie developers who ship apps built with Cursor, Lovable, Bolt or v0.
Write in the maker's own voice (first person singular, "I built").
Hard rules:
- Use only facts from the brief and source material. Never invent numbers, users, customers, testimonials, awards or features.
- Describe how the product works no more broadly than the material does: if it reads a README or a few files, don't say it reads "your code" or "your codebase".
- Never ask for upvotes, votes, or "support on Product Hunt". Product Hunt and Hacker News ban vote solicitation. Asking for feedback is fine.
- No hashtags, except at most two at the very end of the LinkedIn post.
- Avoid hype words: ${BANNED_PHRASES.join(", ")}.
- ${NO_DASHES_RULE}
- Respect every character limit exactly. X posts are measured with X's weighting (links count as 23).
Return JSON only.`;

const firstClause = (s: string) => s.split(/(?<=[a-z0-9])[.!?]\s|\s[–—-]\s|;\s/i)[0].replace(/[.!]$/, "").trim();
const lowerFirst = (s: string) => (s && !/^[A-Z]{2}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const linkFor = (brief: Brief) => brief.url ?? brief.repoUrl ?? "";
const short = (s: string, max = 64) => fitToLimit(firstClause(s).replace(/\s*\([^)]*\)/g, ""), max);
const restOf = (s: string) => s.slice(firstClause(s).length).replace(/^[.!?;:\s–—-]+/, "").trim();

function fitX(lines: string[]): string {
  const kept = [...lines];
  while (kept.length > 1 && xLength(kept.join("\n")) > LIMITS.xPost) {
    const removable = kept.findLastIndex((l, i) => i > 0 && i < kept.length - 1 && l.startsWith("→"));
    kept.splice(removable > 0 ? removable : kept.length - 2, 1);
  }
  return fitToLimit(kept.join("\n").replace(/\n{3,}/g, "\n\n"), LIMITS.xPost, xLength);
}

const TRAILING_STOPWORDS = /\s+(and|or|by|the|to|into|for|of|with|a|an|in|on|your|from|straight)$/i;

function featureTitle(feature: string): string {
  let title = firstClause(feature).replace(/\s*\([^)]*\)/g, "").split(/\s+/).slice(0, 5).join(" ").replace(/[,:;]$/, "");
  while (TRAILING_STOPWORDS.test(title)) title = title.replace(TRAILING_STOPWORDS, "");
  return fitToLimit(title, LIMITS.featureTitle);
}

const firstThatFits = (limit: number, ...candidates: string[]) => candidates.find((c) => charLength(c) <= limit) ?? fitToLimit(candidates[0], limit);

/** Cuts at a natural phrase break rather than mid-sentence, falling back to an ellipsis. */
function trimToPhrase(text: string, limit: number): string {
  const clean = text.trim().replace(/[.!]$/, "");
  if (charLength(clean) <= limit) return clean;
  const head = clean.slice(0, limit + 1);
  const breaks = [", ", " with ", " using ", " built ", " that ", " so ", " for ", " and "]
    .map((b) => head.lastIndexOf(b))
    .filter((i) => i >= 20);
  return breaks.length ? clean.slice(0, Math.max(...breaks)) : fitToLimit(clean, limit);
}

function mockPreview(brief: Brief): Preview {
  const tagline = trimToPhrase(firstClause(brief.oneLiner), LIMITS.phTagline);
  const lines = [`I just launched ${brief.name}.`, "", sentence(brief.oneLiner), "", ...brief.features.slice(0, 3).map((f) => `→ ${short(f)}`)];
  const link = linkFor(brief);
  if (link) lines.push("", link);
  return { tagline, xPost: fitX(lines) };
}

export function mockContent(brief: Brief, preview: Preview): KitContent {
  const link = linkFor(brief);
  const f = brief.features;
  const proof = brief.proofPoints.filter((p) => !p.startsWith("Pricing"));
  const stack = brief.stack.length ? brief.stack.slice(0, 4).join(", ") : undefined;

  const landingFeatures = f.slice(0, 6).map((feature) => ({
    title: featureTitle(feature),
    description: fitToLimit(sentence(feature), LIMITS.featureDescription),
  }));
  if (landingFeatures.length < 3 && proof[0]) landingFeatures.push({ title: "Shipped in public", description: fitToLimit(sentence(proof[0]), LIMITS.featureDescription) });
  if (landingFeatures.length < 3 && stack) landingFeatures.push({ title: "Modern stack", description: `Built on ${stack}.` });
  while (landingFeatures.length < 3) landingFeatures.push({ title: "Made by an indie maker", description: "Built by one person who uses it every day and reads every message." });

  const thread = [
    preview.xPost,
    fitX([`The problem: ${brief.problem}`]),
    fitX([`How ${brief.name} works:`, "", ...f.slice(0, 3).map((x, i) => `${i + 1}. ${short(x, 70)}`)]),
    fitX(f.length > 3 ? ["A few more things it does:", "", ...f.slice(3, 6).map((x) => `→ ${short(x, 70)}`)] : [`Who it's for: ${brief.audience}.`, "", `If that's you, ${lowerFirst(brief.oneLiner)}`]),
    fitX([stack ? `Under the hood: ${stack}.` : `Built and shipped by one person.`, ...(proof.length ? ["", ...proof.slice(0, 2).map((p) => sentence(p))] : [])]),
    fitX([`Try it here: ${link || brief.name}`, "", "I'd love blunt feedback. What would make this a must-have for you?"]),
  ];

  const makerComment = fitToLimit(
    [
      `Hey Product Hunt 👋`,
      "",
      `I'm the maker of ${brief.name}. ${sentence(brief.problem)}`,
      "",
      `So I built ${brief.name}: ${lowerFirst(sentence(brief.oneLiner))}`,
      "",
      "What it does today:",
      ...f.slice(0, 4).map((x) => `• ${short(x, 90)}`),
      ...(stack || proof.length ? ["", [stack && `Built with ${stack}.`, proof[0] && sentence(proof[0])].filter(Boolean).join(" ")] : []),
      "",
      `I'd really value your honest feedback, especially on ${lowerFirst(short(f[0] ?? "the core feature"))}. What's missing for your workflow?`,
    ].join("\n"),
    LIMITS.phMakerComment,
  );

  const linkedin = fitToLimit(
    [
      sentence(brief.problem),
      "",
      `So I built ${brief.name}.`,
      "",
      sentence(brief.oneLiner),
      "",
      "What it does:",
      ...f.slice(0, 4).map((x) => `✅ ${firstClause(x)}`),
      ...(proof.length ? ["", proof.slice(0, 2).map(sentence).join(" ")] : []),
      ...(link ? ["", `It's live now: ${link}`] : []),
      "",
      `If you're one of the ${brief.audience} I built this for, I'd love to hear what you think. What's the one thing you'd want it to do next?`,
      "",
      "#buildinpublic #indiehackers",
    ].join("\n"),
    LIMITS.linkedin,
  );

  return {
    landing: {
      headline: trimToPhrase(firstClause(brief.oneLiner), LIMITS.landingHeadline),
      subheadline: fitToLimit(`${restOf(brief.oneLiner) ? sentence(restOf(brief.oneLiner)) : sentence(brief.problem)} Built for ${brief.audience}.`, LIMITS.landingSubheadline),
      cta: fitToLimit(`Try ${brief.name} free`.length <= LIMITS.landingCta ? `Try ${brief.name} free` : "Get started free", LIMITS.landingCta),
      features: landingFeatures,
      metaTitle: firstThatFits(LIMITS.metaTitle, `${brief.name}: ${preview.tagline}`, preview.tagline, brief.name),
      metaDescription: fitToLimit(sentence(brief.oneLiner), LIMITS.metaDescription),
    },
    productHunt: {
      name: fitToLimit(brief.name, LIMITS.phName),
      tagline: preview.tagline,
      description: fitToLimit(`${sentence(brief.oneLiner)} ${f.slice(0, 2).map((x) => sentence(firstClause(x))).join(" ")}`, LIMITS.phDescription),
      makerComment,
      topics: guessTopics(brief),
    },
    xThread: thread,
    linkedin,
  };
}

function guessTopics(brief: Brief): string[] {
  const text = `${brief.oneLiner} ${brief.features.join(" ")} ${brief.stack.join(" ")}`.toLowerCase();
  const topics: string[] = [];
  const add = (t: string, re: RegExp) => re.test(text) && topics.push(t);
  add("Developer Tools", /\b(api|cli|sdk|developer|code|github|deploy)\b/);
  add("Artificial Intelligence", /\b(ai|gpt|llm|openai|anthropic|model)\b/);
  add("Productivity", /\b(search|organi[sz]e|task|notes?|workflow|screenshot|calendar|focus)\b/);
  add("Design Tools", /\b(design|figma|image|colou?r|ui)\b/);
  add("Marketing", /\b(marketing|seo|launch|social|copy)\b/);
  if (topics.length === 0) topics.push("Productivity", "Tech");
  return topics.slice(0, 3);
}

function checkText(label: string, text: string, limit: number, problems: string[], measure = charLength) {
  if (!text.trim()) problems.push(`${label} is empty.`);
  const len = measure(text);
  if (len > limit) problems.push(`${label} is ${len} characters; the limit is ${limit}.`);
  if (containsVoteBegging(text)) problems.push(`${label} asks for votes or upvotes; remove that.`);
  const banned = BANNED_PHRASES.find((p) => text.toLowerCase().includes(p));
  if (banned) problems.push(`${label} uses the hype word "${banned}".`);
}

export function previewRubric(p: Preview): string[] {
  const problems: string[] = [];
  checkText("tagline", p.tagline, LIMITS.phTagline, problems);
  checkText("xPost", p.xPost, LIMITS.xPost, problems, xLength);
  if (/#\w/.test(p.xPost)) problems.push("xPost must not contain hashtags.");
  return problems;
}

export function contentRubric(c: KitContent): string[] {
  const problems: string[] = [];
  const l = c.landing;
  if (l.features.length < 3 || l.features.length > 6) problems.push(`landing.features has ${l.features.length} items; it must have 3-6.`);
  if (c.productHunt.topics.length > 3) problems.push(`productHunt.topics has ${c.productHunt.topics.length} items; use at most 3.`);
  checkText("landing.headline", l.headline, LIMITS.landingHeadline, problems);
  checkText("landing.subheadline", l.subheadline, LIMITS.landingSubheadline, problems);
  checkText("landing.cta", l.cta, LIMITS.landingCta, problems);
  checkText("landing.metaTitle", l.metaTitle, LIMITS.metaTitle, problems);
  checkText("landing.metaDescription", l.metaDescription, LIMITS.metaDescription, problems);
  l.features.forEach((f, i) => {
    checkText(`landing.features[${i}].title`, f.title, LIMITS.featureTitle, problems);
    checkText(`landing.features[${i}].description`, f.description, LIMITS.featureDescription, problems);
  });
  const ph = c.productHunt;
  checkText("productHunt.name", ph.name, LIMITS.phName, problems);
  checkText("productHunt.tagline", ph.tagline, LIMITS.phTagline, problems);
  checkText("productHunt.description", ph.description, LIMITS.phDescription, problems);
  checkText("productHunt.makerComment", ph.makerComment, LIMITS.phMakerComment, problems);
  if (c.xThread.length < LIMITS.xThreadMin || c.xThread.length > LIMITS.xThreadMax) {
    problems.push(`xThread has ${c.xThread.length} posts; it must have ${LIMITS.xThreadMin}-${LIMITS.xThreadMax}.`);
  }
  c.xThread.forEach((post, i) => {
    checkText(`xThread[${i}]`, post, LIMITS.xPost, problems, xLength);
    if (/#\w/.test(post)) problems.push(`xThread[${i}] must not contain hashtags.`);
  });
  checkText("linkedin", c.linkedin, LIMITS.linkedin, problems);
  return problems;
}

/** Pieces the model left out. A paid kit with any of these is an error, never patched with template copy. */
function incompleteFields(c: KitContent): string[] {
  const missing: string[] = [];
  const need = (label: string, text: string) => !text.trim() && missing.push(label);
  const l = c.landing;
  for (const k of ["headline", "subheadline", "cta", "metaTitle", "metaDescription"] as const) need(`landing.${k}`, l[k]);
  if (l.features.filter((f) => f.title.trim() && f.description.trim()).length < 3) missing.push("landing.features (fewer than 3)");
  for (const k of ["name", "tagline", "description", "makerComment"] as const) need(`productHunt.${k}`, c.productHunt[k]);
  need("linkedin", c.linkedin);
  return missing;
}

/** Final safety net after the LLM: strip vote requests and hard-fit every limit. Throws LlmError if a piece is missing. */
export function enforceContent(c: KitContent): KitContent {
  const missing = incompleteFields(c);
  const t = (s: string, limit: number) => fitToLimit(stripVoteBegging(s), limit);
  let thread = c.xThread.map((p) => fitToLimit(stripVoteBegging(p).replace(/(^|\s)#\w+/g, "").trim(), LIMITS.xPost, xLength)).filter(Boolean);
  if (thread.length > LIMITS.xThreadMax) thread = thread.slice(0, LIMITS.xThreadMax);
  if (thread.length < LIMITS.xThreadMin) missing.push(`xThread (${thread.length} usable posts)`);
  if (missing.length) throw new LlmError(`Kit copy is incomplete: ${missing.join(", ")}`);

  const features = c.landing.features
    .filter((f) => f.title.trim() && f.description.trim())
    .slice(0, 6)
    .map((f) => ({ title: t(f.title, LIMITS.featureTitle), description: t(f.description, LIMITS.featureDescription) }));
  return {
    landing: {
      headline: t(c.landing.headline, LIMITS.landingHeadline),
      subheadline: t(c.landing.subheadline, LIMITS.landingSubheadline),
      cta: t(c.landing.cta, LIMITS.landingCta),
      features,
      metaTitle: t(c.landing.metaTitle, LIMITS.metaTitle),
      metaDescription: t(c.landing.metaDescription, LIMITS.metaDescription),
    },
    productHunt: {
      name: t(c.productHunt.name, LIMITS.phName),
      tagline: t(c.productHunt.tagline, LIMITS.phTagline),
      description: t(c.productHunt.description, LIMITS.phDescription),
      makerComment: t(c.productHunt.makerComment, LIMITS.phMakerComment),
      topics: c.productHunt.topics.slice(0, 3),
    },
    xThread: thread,
    linkedin: t(c.linkedin, LIMITS.linkedin),
  };
}

const briefJson = (brief: Brief) => JSON.stringify(brief, null, 2);

export async function generatePreview(brief: Brief): Promise<{ preview: Preview; provider: string }> {
  const { value, provider } = await generateStructured({
    schema: previewSchema,
    system: SYSTEM,
    user: `Product brief:\n${briefJson(brief)}\n\nWrite JSON with:\n- tagline: a Product Hunt tagline, max ${LIMITS.phTagline} characters, concrete benefit, no product name, no trailing period.\n- xPost: the opening launch post of an X thread, max ${LIMITS.xPost} weighted characters, includes the link ${linkFor(brief) || "(no link known; omit it)"}, no hashtags.`,
    mock: () => mockPreview(brief),
    rubric: previewRubric,
    maxOutputTokens: OUTPUT_TOKENS.preview,
    stage: "preview",
  });
  const tagline = stripVoteBegging(value.tagline).replace(/\.$/, "").trim();
  const xPost = stripVoteBegging(value.xPost).trim();
  if (!tagline || !xPost) throw new LlmError(`The preview came back without ${tagline ? "an X post" : "a tagline"}`);
  return { preview: { tagline: fitToLimit(tagline, LIMITS.phTagline), xPost: fitToLimit(xPost, LIMITS.xPost, xLength) }, provider };
}

const TAGLINE_OPTIONS = 3;
const taglinesSchema = z.object({ taglines: z.array(z.string()) });

/** "Your app" is the brief's placeholder when no name was found; don't check taglines against it. */
const realName = (brief: Brief) => (brief.name === "Your app" ? "" : brief.name);

const usableTagline = (t: string, brief: Brief) => checkTagline(t, realName(brief)).verdict !== "fail";

function cleanTagline(t: string): string {
  return stripVoteBegging(t).replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim();
}

/** Deterministic options from the brief: the free-preview tagline first, then feature-led variants. */
function mockTaglines(brief: Brief): string[] {
  const audience = brief.audience.trim();
  const candidates = [
    mockPreview(brief).tagline,
    ...brief.features.flatMap((f) => {
      const clause = short(f, 200);
      return [`${clause} for ${audience}`, trimToPhrase(clause, LIMITS.phTagline)];
    }),
    `${trimToPhrase(firstClause(brief.oneLiner), 40)} for ${audience}`,
    trimToPhrase(restOf(brief.oneLiner) || brief.problem, LIMITS.phTagline),
    `Built for ${audience}`,
  ];
  return pickTaglines(candidates, brief, LAST_RESORT_TAGLINES);
}

/** Only used when the brief is too thin to produce three distinct options. */
const LAST_RESORT_TAGLINES = ["Does one job well, without the setup", "Built by an indie maker who uses it every day", "Small, fast and made for real work"];

/** Up to TAGLINE_OPTIONS distinct, usable options, topped up from `fallback`. */
function pickTaglines(candidates: string[], brief: Brief, fallback: string[]): string[] {
  const picked: string[] = [];
  for (const raw of [...candidates, ...fallback]) {
    const t = cleanTagline(raw);
    if (!t || t.endsWith("…") || !usableTagline(t, brief) || picked.some((p) => p.toLowerCase() === t.toLowerCase())) continue;
    picked.push(t);
    if (picked.length === TAGLINE_OPTIONS) break;
  }
  return picked;
}

function taglinesRubric(v: { taglines: string[] }, brief: Brief): string[] {
  const problems: string[] = [];
  if (v.taglines.length !== TAGLINE_OPTIONS) problems.push(`taglines has ${v.taglines.length} items; it must have exactly ${TAGLINE_OPTIONS}.`);
  if (new Set(v.taglines.map((t) => t.trim().toLowerCase())).size !== v.taglines.length) problems.push("taglines must all be different.");
  v.taglines.forEach((t, i) => {
    problems.push(...taglineProblems(t, realName(brief), `taglines[${i}]`));
    checkText(`taglines[${i}]`, t, LIMITS.phTagline, problems);
  });
  return [...new Set(problems)];
}

/** Three Product Hunt tagline options for the free tagline checker, from the same brief the free preview uses. */
export async function generateTaglines(brief: Brief): Promise<{ taglines: string[]; provider: string }> {
  const { value, provider } = await generateStructured({
    schema: taglinesSchema,
    system: SYSTEM,
    speed: "fast",
    user: `Product brief:\n${briefJson(brief)}\n\nWrite JSON { "taglines": [${TAGLINE_OPTIONS} different Product Hunt taglines] }. Each one: max ${LIMITS.phTagline} characters, says what the product does and for whom using facts from the brief, sentence case, no product name, no trailing period, no emoji, no "AI-powered", "revolutionary", "ultimate" or "seamless". Use a different angle for each, for example "[Outcome] for [who]", "[Action] without [pain]", and a plain description of the main feature.`,
    mock: () => ({ taglines: mockTaglines(brief) }),
    rubric: (v) => taglinesRubric(v, brief),
    maxOutputTokens: OUTPUT_TOKENS.preview,
    stage: "preview",
  });
  // Only the model's own options: template taglines never top up the list.
  const taglines = pickTaglines(value.taglines, brief, []);
  if (!taglines.length) throw new LlmError("No usable tagline came back");
  return { taglines, provider };
}

const SECTION_PREFIX: Record<KitSection, string> = { landing: "landing.", productHunt: "productHunt.", xThread: "xThread", linkedin: "linkedin" };

interface SectionSpec<T> {
  schema: z.ZodType<T>;
  speed: "main" | "fast";
  /** Defaults to OUTPUT_TOKENS.kitSection. */
  maxOutputTokens?: number;
  prompt: (brief: Brief, preview: Preview) => string;
  toContent: (value: T) => Partial<KitContent>;
}

const SECTIONS: { [K in KitSection]: SectionSpec<unknown> } = {
  landing: {
    schema: kitContentSchema.shape.landing,
    speed: "fast",
    prompt: () =>
      `Write landing page copy as JSON: { "headline" (max ${LIMITS.landingHeadline}), "subheadline" (max ${LIMITS.landingSubheadline}), "cta" (button label, max ${LIMITS.landingCta}), "features": [3-6 × { "title" (max ${LIMITS.featureTitle}), "description" (max ${LIMITS.featureDescription}) }], "metaTitle" (max ${LIMITS.metaTitle}), "metaDescription" (max ${LIMITS.metaDescription}) }`,
    toContent: (v) => ({ landing: v as KitContent["landing"] }),
  },
  productHunt: {
    schema: kitContentSchema.shape.productHunt,
    speed: "fast",
    prompt: (_b, preview) =>
      `Write the Product Hunt post as JSON: { "name" (max ${LIMITS.phName}), "tagline" (use exactly: "${preview.tagline}"), "description" (max ${LIMITS.phDescription}), "makerComment" (first comment from the maker: the story, what it does, an honest ask for feedback; max ${LIMITS.phMakerComment}), "topics": [up to 3 Product Hunt topics] }`,
    toContent: (v) => ({ productHunt: v as KitContent["productHunt"] }),
  },
  xThread: {
    schema: z.object({ posts: z.array(z.string()) }),
    speed: "main",
    prompt: (_b, preview) =>
      `Write an X launch thread as JSON: { "posts": [${LIMITS.xThreadMin}-${LIMITS.xThreadMax} posts, each max ${LIMITS.xPost} weighted chars; post 1 must be exactly: ${JSON.stringify(preview.xPost)}; last post has the link and asks for feedback] }`,
    toContent: (v) => ({ xThread: (v as { posts: string[] }).posts }),
  },
  linkedin: {
    schema: z.object({ post: z.string() }),
    speed: "fast",
    maxOutputTokens: OUTPUT_TOKENS.linkedin,
    prompt: () => `Write a LinkedIn launch post as JSON: { "post": "strong first line, short paragraphs, max ${LIMITS.linkedin} chars, at most 2 hashtags at the end" }`,
    toContent: (v) => ({ linkedin: (v as { post: string }).post }),
  },
};

export const KIT_SECTIONS = Object.keys(SECTIONS) as KitSection[];

/** Generates one section of the kit. Sections are independent so they run in parallel. */
export async function generateKitSection(section: KitSection, brief: Brief, preview: Preview, digest: string): Promise<{ content: Partial<KitContent>; provider: string }> {
  const spec = SECTIONS[section];
  const fallback = mockContent(brief, preview);
  const fallbackValue = { landing: fallback.landing, productHunt: fallback.productHunt, xThread: { posts: fallback.xThread }, linkedin: { post: fallback.linkedin } }[section];
  const { value, provider } = await generateStructured<unknown>({
    schema: spec.schema,
    speed: spec.speed,
    maxOutputTokens: spec.maxOutputTokens ?? OUTPUT_TOKENS.kitSection,
    stage: "kit",
    system: SYSTEM,
    user: `Product brief:\n${briefJson(brief)}\n\nSupporting source material (for facts only):\n${digest}\n\n${spec.prompt(brief, preview)}`,
    mock: () => fallbackValue,
    rubric: (v) => contentRubric({ ...fallback, ...spec.toContent(v) }).filter((p) => p.startsWith(SECTION_PREFIX[section])),
  });
  // The other sections come from the template only to complete the shape; just this section is kept.
  const enforced = enforceContent({ ...fallback, ...spec.toContent(value) });
  const key = section as keyof KitContent;
  return { content: { [key]: enforced[key] } as Partial<KitContent>, provider };
}

export function launchChecklist(brief: Brief): string[] {
  return [
    "Pick a launch day (Tuesday to Thursday is busiest) and schedule the Product Hunt post for 12:01am Pacific.",
    "On Product Hunt, paste the name, tagline and description from this kit, then upload the gallery image first and the other two after it.",
    "Post the maker comment as the first comment on your launch as soon as it goes live.",
    `Update your landing page hero, meta title and meta description, and set og:image to og-1200x630.png on ${brief.url ?? "your site"}.`,
    "Publish the X thread from your own account at launch time, attach x-1600x900.png to post 1 and pin it.",
    "Post the LinkedIn version 2 to 3 hours later to catch the UK and US mornings.",
    "Tell your users, email list and friends you've launched. Ask for feedback and questions, not votes: Product Hunt bans vote requests and penalises them.",
    "Reply to every comment within the first 6 hours, with specifics rather than \"thanks!\".",
    "Share on Indie Hackers, r/SideProject and relevant Discords, following each community's self-promotion rules.",
    "The day after, post a short follow-up with what you learned and real numbers (visitors, sign-ups, feedback themes).",
  ];
}
