import { z } from "zod";
import type { Attribution } from "./attribution";

export const paletteSchema = z.object({
  background: z.string(),
  foreground: z.string(),
  accent: z.string(),
  accentForeground: z.string(),
  muted: z.string(),
  source: z.enum(["site", "repo", "default"]),
});
export type Palette = z.infer<typeof paletteSchema>;

// Schemas below are also sent to the model as structured-output schemas, so they
// hold types only. Lengths and counts are enforced by the rubrics in copy.ts.
export const briefSchema = z.object({
  name: z.string(),
  oneLiner: z.string(),
  audience: z.string(),
  problem: z.string(),
  features: z.array(z.string()),
  proofPoints: z.array(z.string()),
  stack: z.array(z.string()),
  tone: z.string(),
  url: z.string().optional(),
  repoUrl: z.string().optional(),
});
export type Brief = z.infer<typeof briefSchema>;

export const previewSchema = z.object({
  tagline: z.string(),
  xPost: z.string(),
});
export type Preview = z.infer<typeof previewSchema>;

export const kitContentSchema = z.object({
  landing: z.object({
    headline: z.string(),
    subheadline: z.string(),
    cta: z.string(),
    features: z.array(z.object({ title: z.string(), description: z.string() })),
    metaTitle: z.string(),
    metaDescription: z.string(),
  }),
  productHunt: z.object({
    name: z.string(),
    tagline: z.string(),
    description: z.string(),
    makerComment: z.string(),
    topics: z.array(z.string()),
  }),
  xThread: z.array(z.string()),
  linkedin: z.string(),
});
export type KitContent = z.infer<typeof kitContentSchema>;
export type KitSection = keyof KitContent;

export type KitStatus = "preview" | "paid" | "generating" | "ready" | "failed";

export interface SourceSummary {
  input: string;
  repoUrl?: string;
  siteUrl?: string;
  stars?: number;
  commitsAnalysed: number;
  /** Repo URL + head commit, when known. Identical states reuse one generation for 24 hours. */
  fingerprint?: string;
  readmeFound: boolean;
  packageJsonFound: boolean;
  pageScraped: boolean;
  warnings: string[];
}

/** What Satori can draw. It renders WebP, GIF and AVIF as blank boxes, so those are never kept. */
export type KitImageFormat = "png" | "jpeg" | "svg";

/** An image found at ingest and checked for size and format. The bytes are fetched again (SSRF-guarded) when an image is rendered. */
export interface KitImageRef {
  url: string;
  width: number;
  height: number;
  format: KitImageFormat;
  source: "readme" | "repo" | "site" | "avatar";
}

export interface KitVisuals {
  screenshot?: KitImageRef;
  logo?: KitImageRef;
}

/** What Stripe charged: `amount_total` in minor units (pence) and its lowercase ISO currency. */
export interface PaidAmount {
  amount: number;
  currency: string;
}

export interface Kit {
  id: string;
  createdAt: string;
  status: KitStatus;
  source: SourceSummary;
  brief: Brief;
  palette: Palette;
  /** Product screenshot and logo for the kit images. Absent on kits made before they were collected. */
  visuals?: KitVisuals;
  preview: Preview;
  /** Grounding text from ingest, reused when the full kit is generated after payment. */
  digest: string;
  llm: string;
  paid: boolean;
  email?: string;
  /** Account (lowercased email) the kit belongs to, once claimed or created while logged in. */
  ownerEmail?: string;
  /** Kit whose generation was reused (same repo and commit within 24 hours). */
  reusedFrom?: string;
  /** First-touch UTMs and referring domain from the browser that requested the preview. Absent on older kits. */
  attribution?: Attribution;
  paymentRef?: string;
  /** Absent on kits paid before it was recorded: their emails name no price. */
  paidAmount?: PaidAmount;
  paidAt?: string;
  content?: KitContent;
  checklist?: string[];
  generationStartedAt?: string;
  generatedAt?: string;
  /** When the full kit became visible to the buyer. readyAt - paidAt is the post-payment wait. */
  readyAt?: string;
  attempts: number;
  error?: string;
  emailedAt?: string;
  /** After a failed attempt: the next automatic attempt isn't due before this. */
  nextAttemptAt?: string;
  /** Every automatic attempt failed: someone must deliver the kit or refund it by hand. Cleared if a later retry succeeds. */
  refund_needed?: boolean;
  failedAt?: string;
  /** The "we hit a problem, you'll get it or a refund" email went out (sent once per kit). */
  failureEmailedAt?: string;
}
