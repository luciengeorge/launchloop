import "server-only";
import { LIMITS, charLength, containsVoteBegging, fitToLimit, stripVoteBegging, xLength } from "./limits";
import { generateStructured } from "./llm";
import { kitContentSchema, previewSchema, type Brief, type KitContent, type Preview } from "./schema";

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
- Never ask for upvotes, votes, or "support on Product Hunt". Product Hunt and Hacker News ban vote solicitation. Asking for feedback is fine.
- No hashtags, except at most two at the very end of the LinkedIn post.
- Avoid hype words: ${BANNED_PHRASES.join(", ")}.
- Respect every character limit exactly. X posts are measured with X's weighting (links count as 23).
Return JSON only.`;

const firstClause = (s: string) => s.split(/(?<=[a-z0-9])[.!?]\s|\s[–—-]\s|;\s/i)[0].replace(/[.!]$/, "").trim();
const lowerFirst = (s: string) => (s && !/^[A-Z]{2}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const linkFor = (brief: Brief) => brief.url ?? brief.repoUrl ?? "";

function fitX(lines: string[]): string {
  const kept = [...lines];
  while (kept.length > 1 && xLength(kept.join("\n")) > LIMITS.xPost) {
    const removable = kept.findLastIndex((l, i) => i > 0 && i < kept.length - 1 && l.startsWith("→"));
    kept.splice(removable > 0 ? removable : kept.length - 2, 1);
  }
  return fitToLimit(kept.join("\n").replace(/\n{3,}/g, "\n\n"), LIMITS.xPost, xLength);
}

function featureTitle(feature: string): string {
  const words = firstClause(feature).replace(/\(.*?\)/g, "").split(/\s+/).slice(0, 5).join(" ");
  return fitToLimit(words.replace(/[,:]$/, ""), LIMITS.featureTitle);
}

function mockPreview(brief: Brief): Preview {
  const tagline = fitToLimit(firstClause(brief.oneLiner), LIMITS.phTagline);
  const lines = [`I just launched ${brief.name}.`, "", sentence(brief.oneLiner), "", ...brief.features.slice(0, 3).map((f) => `→ ${firstClause(f)}`)];
  const link = linkFor(brief);
  if (link) lines.push("", link);
  return { tagline, xPost: fitX(lines) };
}

function mockContent(brief: Brief, preview: Preview): KitContent {
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
    fitX([`How ${brief.name} works:`, "", ...f.slice(0, 3).map((x, i) => `${i + 1}. ${firstClause(x)}`)]),
    fitX(f.length > 3 ? ["A few more things it does:", "", ...f.slice(3, 6).map((x) => `→ ${firstClause(x)}`)] : [`Who it's for: ${brief.audience}.`, "", `If that's you, ${lowerFirst(brief.oneLiner)}`]),
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
      ...f.slice(0, 4).map((x) => `• ${firstClause(x)}`),
      ...(stack || proof.length ? ["", [stack && `Built with ${stack}.`, proof[0] && sentence(proof[0])].filter(Boolean).join(" ")] : []),
      "",
      `I'd really value your honest feedback, especially on ${lowerFirst(firstClause(f[0] ?? "the core feature"))}. What's missing for your workflow?`,
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
      headline: fitToLimit(firstClause(brief.oneLiner), LIMITS.landingHeadline),
      subheadline: fitToLimit(`${sentence(brief.problem)} ${brief.name} fixes that for ${brief.audience}.`, LIMITS.landingSubheadline),
      cta: fitToLimit(`Try ${brief.name} free`.length <= LIMITS.landingCta ? `Try ${brief.name} free` : "Get started free", LIMITS.landingCta),
      features: landingFeatures,
      metaTitle: fitToLimit(`${brief.name}: ${preview.tagline}`, LIMITS.metaTitle),
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

/** Final safety net after the LLM: strip vote requests and hard-fit every limit. */
export function enforceContent(c: KitContent, fallback: KitContent): KitContent {
  const t = (s: string, limit: number) => fitToLimit(stripVoteBegging(s), limit);
  let thread = c.xThread.map((p) => fitToLimit(stripVoteBegging(p).replace(/(^|\s)#\w+/g, "").trim(), LIMITS.xPost, xLength)).filter(Boolean);
  if (thread.length > LIMITS.xThreadMax) thread = thread.slice(0, LIMITS.xThreadMax);
  for (let i = thread.length; i < LIMITS.xThreadMin; i++) thread.push(fallback.xThread[i] ?? fallback.xThread.at(-1)!);

  const features = c.landing.features.slice(0, 6).map((f) => ({ title: t(f.title, LIMITS.featureTitle), description: t(f.description, LIMITS.featureDescription) }));
  return {
    landing: {
      headline: t(c.landing.headline, LIMITS.landingHeadline),
      subheadline: t(c.landing.subheadline, LIMITS.landingSubheadline),
      cta: t(c.landing.cta, LIMITS.landingCta),
      features: features.length >= 3 ? features : fallback.landing.features,
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
  });
  return {
    preview: {
      tagline: fitToLimit(stripVoteBegging(value.tagline).replace(/\.$/, ""), LIMITS.phTagline),
      xPost: fitToLimit(stripVoteBegging(value.xPost), LIMITS.xPost, xLength),
    },
    provider,
  };
}

export async function generateKitContent(brief: Brief, preview: Preview, digest: string): Promise<{ content: KitContent; provider: string }> {
  const fallback = mockContent(brief, preview);
  const { value, provider } = await generateStructured({
    schema: kitContentSchema,
    system: SYSTEM,
    user: `Product brief:\n${briefJson(brief)}\n\nSupporting source material (for facts only):\n${digest}\n\nWrite the full launch kit as JSON with this exact shape:
{
  "landing": { "headline" (max ${LIMITS.landingHeadline}), "subheadline" (max ${LIMITS.landingSubheadline}), "cta" (button label, max ${LIMITS.landingCta}), "features": [3-6 × { "title" (max ${LIMITS.featureTitle}), "description" (max ${LIMITS.featureDescription}) }], "metaTitle" (max ${LIMITS.metaTitle}), "metaDescription" (max ${LIMITS.metaDescription}) },
  "productHunt": { "name" (max ${LIMITS.phName}), "tagline" (use exactly: "${preview.tagline}"), "description" (max ${LIMITS.phDescription}), "makerComment" (first comment from the maker: the story, what it does, an honest ask for feedback; max ${LIMITS.phMakerComment}), "topics": [up to 3 Product Hunt topics] },
  "xThread": [${LIMITS.xThreadMin}-${LIMITS.xThreadMax} posts, each max ${LIMITS.xPost} weighted chars; post 1 must be exactly: ${JSON.stringify(preview.xPost)}; last post has the link and asks for feedback],
  "linkedin": "a LinkedIn launch post, strong first line, short paragraphs, max ${LIMITS.linkedin} chars, at most 2 hashtags at the end"
}`,
    mock: () => fallback,
    rubric: contentRubric,
  });
  return { content: enforceContent(value, fallback), provider };
}

export function launchChecklist(brief: Brief): string[] {
  return [
    "Pick a launch day (Tuesday to Thursday is busiest) and schedule the Product Hunt post for 12:01am Pacific.",
    "On Product Hunt, paste the name, tagline and description from this kit, then upload the gallery image first and the other two after it.",
    "Post the maker comment as the first comment on your launch as soon as it goes live.",
    `Update your landing page hero, meta title and meta description, and set og:image to og-1200x630.png on ${brief.url ?? "your site"}.`,
    "Publish the X thread from your own account at launch time, attach x-1600x900.png to post 1 and pin it.",
    "Post the LinkedIn version 2–3 hours later to catch the UK and US mornings.",
    "Tell your users, email list and friends you've launched. Ask for feedback and questions, never for upvotes: Product Hunt bans vote requests and penalises them.",
    "Reply to every comment within the first 6 hours, with specifics rather than \"thanks!\".",
    "Share on Indie Hackers, r/SideProject and relevant Discords, following each community's self-promotion rules.",
    "The day after, post a short follow-up with what you learned and real numbers (visitors, sign-ups, feedback themes).",
  ];
}
