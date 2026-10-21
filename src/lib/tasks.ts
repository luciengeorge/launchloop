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
  /** A line and a button into the kit form (/#start), in place of a hint that would be a dead end. */
  cta?: { text: string; label: string };
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
  /** Real steps for paid kits; masked placeholders for locked kits (shown blurred under a generic title). */
  checklist: string[];
  locked: boolean;
  /** Real free pieces, readable even when locked. */
  free?: { tagline: string; xPost: string };
  /** The static example kit (/example-kit): nothing to regenerate or unlock, so its steps point to a preview of your own. */
  example?: boolean;
  /** Product brief — always shown as the first stage (readable even when locked). */
  brief?: Brief;
}

export const EXAMPLE_KIT_CTA = { text: "This is a sample kit. Want one for your product?", label: "Start my free preview" };

export function buildTasks({ content: c, checklist, locked, free, brief, example = false }: BuildInput): KitTask[] {
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
      ...(example ? { cta: EXAMPLE_KIT_CTA } : { hint: "Skim the brief above. If anything looks wrong, regenerate a preview before you unlock." }),
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

  checklist.forEach((item, i) => add(locked ? { id: `step.${i + 1}`, group: "Launch day", title: `Launch-day step ${i + 1}`, text: item } : { id: `step.${i + 1}`, group: "Launch day", title: item }));
  return tasks;
}

/** Tasks that can be ticked (pending placeholders can't). */
export const countableTasks = (tasks: KitTask[]) => tasks.filter((t) => !t.pending);

const MASK_CHAR = "•";

/**
 * Replaces every word with a run of mask dots of a similar length, keeping line
 * breaks, so the blurred preview has the real shape but none of the real text
 * (and nothing that reads as content if it's copied or read aloud).
 */
export function mask(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => MASK_CHAR.repeat(Math.min(Math.max([...word].length, 2), 12)))
        .join(" "),
    )
    .join("\n");
}

export function maskContent(c: KitContent): KitContent {
  return {
    landing: {
      headline: mask(c.landing.headline),
      subheadline: mask(c.landing.subheadline),
      cta: mask(c.landing.cta),
      features: c.landing.features.map((f) => ({ title: mask(f.title), description: mask(f.description) })),
      metaTitle: mask(c.landing.metaTitle),
      metaDescription: mask(c.landing.metaDescription),
    },
    productHunt: {
      name: mask(c.productHunt.name),
      tagline: mask(c.productHunt.tagline),
      description: mask(c.productHunt.description),
      makerComment: mask(c.productHunt.makerComment),
      topics: c.productHunt.topics.map(mask),
    },
    xThread: c.xThread.map(mask),
    linkedin: mask(c.linkedin),
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
