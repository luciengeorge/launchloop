import { z } from "zod";

export const paletteSchema = z.object({
  background: z.string(),
  foreground: z.string(),
  accent: z.string(),
  accentForeground: z.string(),
  muted: z.string(),
  source: z.enum(["site", "default"]),
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

export type KitStatus = "preview" | "paid" | "generating" | "ready" | "failed";

export interface SourceSummary {
  input: string;
  repoUrl?: string;
  siteUrl?: string;
  stars?: number;
  commitsAnalysed: number;
  readmeFound: boolean;
  packageJsonFound: boolean;
  pageScraped: boolean;
  warnings: string[];
}

export interface Kit {
  id: string;
  createdAt: string;
  status: KitStatus;
  source: SourceSummary;
  brief: Brief;
  palette: Palette;
  preview: Preview;
  /** Grounding text from ingest, reused when the full kit is generated after payment. */
  digest: string;
  llm: string;
  paid: boolean;
  email?: string;
  paymentRef?: string;
  paidAt?: string;
  content?: KitContent;
  checklist?: string[];
  generationStartedAt?: string;
  generatedAt?: string;
  attempts: number;
  error?: string;
  emailedAt?: string;
}
