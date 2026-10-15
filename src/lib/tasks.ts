import { IMAGE_VARIANTS, type ImageVariant } from "./image-variants";
import { LIMITS } from "./limits";
import type { Brief, KitContent } from "./schema";

/** One step of the launch checklist. Serialisable so it can be passed to the client. */
export interface KitTask {
  id: string;
  group: TaskGroup;
  title: string;
  /** Text to copy. For locked tasks this is placeholder text, never the real copy. */
  text?: string;
  limit?: number;
  measure?: "chars" | "x";
  hint?: string;
  image?: ImageVariant;
  /** Locked tasks render blurred placeholders with no copy button. */
  locked: boolean;
  /** Still generating (paid kits only). */
  pending?: boolean;
}

/** Pipeline stages shown on the kit page (order matters). */
export const TASK_GROUPS = ["Brief", "Landing", "Product Hunt", "X", "LinkedIn", "Images", "Launch day"] as const;
export type TaskGroup = (typeof TASK_GROUPS)[number];

export interface PipelineStage {
  id: TaskGroup;
  label: TaskGroup;
}

export const PIPELINE_STAGES: PipelineStage[] = TASK_GROUPS.map((g) => ({ id: g, label: g }));

interface BuildInput {
  /** Real content for paid kits; placeholder content (same shape) for locked kits. Missing sections are pending. */
  content: Partial<KitContent>;
  checklist: string[];
  locked: boolean;
  /** Real free pieces, readable even when locked. */
  free?: { tagline: string; xPost: string };
  /** Product brief — always shown as the first stage (readable even when locked). */
  brief?: Brief;
}

export function buildTasks({ content: c, checklist, locked, free, brief }: BuildInput): KitTask[] {
  const tasks: KitTask[] = [];
  const add = (t: Omit<KitTask, "locked"> & { locked?: boolean }) => tasks.push({ locked, ...t });
  const pending = (group: TaskGroup, id: string, title: string) => add({ id, group, title, pending: true });

  if (brief) {
    add({
      id: "brief.review",
      group: "Brief",
      title: "Confirm product brief",
      text: [brief.name, brief.oneLiner, `Audience: ${brief.audience}`, `Problem: ${brief.problem}`, brief.features.length ? `Features:\n${brief.features.map((f) => `• ${f}`).join("\n")}` : ""]
        .filter(Boolean)
        .join("\n\n"),
      hint: "Skim the brief above. If anything looks wrong, regenerate a preview before you unlock.",
      locked: false,
    });
  } else {
    pending("Brief", "brief.review", "Confirm product brief");
  }

  if (c.landing) {
    const l = c.landing;
    add({ id: "landing.headline", group: "Landing", title: "Hero headline", text: l.headline, limit: LIMITS.landingHeadline });
    add({ id: "landing.subheadline", group: "Landing", title: "Subheadline", text: l.subheadline, limit: LIMITS.landingSubheadline });
    add({ id: "landing.cta", group: "Landing", title: "Call-to-action button", text: l.cta, limit: LIMITS.landingCta });
    add({ id: "landing.features", group: "Landing", title: `Feature blocks (${l.features.length})`, text: l.features.map((f) => `${f.title}\n${f.description}`).join("\n\n") });
    add({ id: "meta.title", group: "Landing", title: "Meta title", text: l.metaTitle, limit: LIMITS.metaTitle });
    add({ id: "meta.description", group: "Landing", title: "Meta description", text: l.metaDescription, limit: LIMITS.metaDescription });
  } else {
    pending("Landing", "landing.headline", "Landing page copy");
  }

  if (c.productHunt) {
    const ph = c.productHunt;
    add({ id: "ph.name", group: "Product Hunt", title: "Name", text: ph.name, limit: LIMITS.phName });
    add({ id: "ph.tagline", group: "Product Hunt", title: "Tagline", text: free?.tagline ?? ph.tagline, limit: LIMITS.phTagline, locked: free ? false : locked });
    add({ id: "ph.description", group: "Product Hunt", title: "Description", text: ph.description, limit: LIMITS.phDescription });
    add({ id: "ph.topics", group: "Product Hunt", title: "Topics", text: ph.topics.join(", ") });
    add({
      id: "ph.maker",
      group: "Product Hunt",
      title: "Maker comment",
      text: ph.makerComment,
      limit: LIMITS.phMakerComment,
      hint: "Post this as the first comment the moment you go live. It asks for feedback, not votes: Product Hunt bans vote requests.",
    });
  } else pending("Product Hunt", "ph.name", "Product Hunt post");

  if (c.xThread) {
    c.xThread.forEach((post, i) =>
      add({
        id: `x.${i + 1}`,
        group: "X",
        title: `Post ${i + 1} of ${c.xThread!.length}`,
        text: i === 0 && free ? free.xPost : post,
        limit: LIMITS.xPost,
        measure: "x",
        locked: i === 0 && free ? false : locked,
      }),
    );
  } else pending("X", "x.1", "X launch thread");

  if (c.linkedin !== undefined) add({ id: "linkedin", group: "LinkedIn", title: "LinkedIn post", text: c.linkedin, limit: LIMITS.linkedin });
  else pending("LinkedIn", "linkedin", "LinkedIn post");

  for (const v of Object.keys(IMAGE_VARIANTS) as ImageVariant[]) {
    add({ id: `img.${v}`, group: "Images", title: IMAGE_VARIANTS[v].label, image: v });
  }

  checklist.forEach((item, i) => add({ id: `step.${i + 1}`, group: "Launch day", title: item }));
  return tasks;
}

/** Tasks that can be ticked (pending placeholders can't). */
export const countableTasks = (tasks: KitTask[]) => tasks.filter((t) => !t.pending);

const LOREM =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(
    " ",
  );

/**
 * Replaces every word with lorem ipsum of a similar length, keeping line
 * breaks, so the blurred preview has the real shape but none of the real text.
 */
export function scramble(text: string, seed: string): string {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const next = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  return text
    .split("\n")
    .map((line) =>
      line
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => {
          const len = Math.min(Math.max([...word].length, 2), 12);
          const candidates = LOREM.filter((w) => Math.abs(w.length - len) <= 1);
          return candidates[Math.floor(next() * candidates.length)] ?? "lorem";
        })
        .join(" "),
    )
    .join("\n");
}

export function scrambleContent(c: KitContent, seed: string): KitContent {
  const s = (text: string, key: string) => scramble(text, `${seed}:${key}`);
  return {
    landing: {
      headline: s(c.landing.headline, "h"),
      subheadline: s(c.landing.subheadline, "sh"),
      cta: s(c.landing.cta, "cta"),
      features: c.landing.features.map((f, i) => ({ title: s(f.title, `ft${i}`), description: s(f.description, `fd${i}`) })),
      metaTitle: s(c.landing.metaTitle, "mt"),
      metaDescription: s(c.landing.metaDescription, "md"),
    },
    productHunt: {
      name: s(c.productHunt.name, "n"),
      tagline: s(c.productHunt.tagline, "t"),
      description: s(c.productHunt.description, "d"),
      makerComment: s(c.productHunt.makerComment, "m"),
      topics: c.productHunt.topics.map((t, i) => s(t, `tp${i}`)),
    },
    xThread: c.xThread.map((p, i) => s(p, `x${i}`)),
    linkedin: s(c.linkedin, "li"),
  };
}

/** First incomplete stage, or the last stage when everything is done. */
export function currentStageIndex(tasks: KitTask[], done: Set<string>): number {
  for (let i = 0; i < TASK_GROUPS.length; i++) {
    const items = tasks.filter((t) => t.group === TASK_GROUPS[i] && !t.pending);
    if (!items.length) continue;
    if (items.some((t) => !done.has(t.id))) return i;
  }
  return Math.max(0, TASK_GROUPS.length - 1);
}
