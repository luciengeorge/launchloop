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

export const briefSchema = z.object({
  name: z.string().min(1),
  oneLiner: z.string().min(1),
  audience: z.string().min(1),
  problem: z.string().min(1),
  features: z.array(z.string().min(1)).min(1).max(8),
  proofPoints: z.array(z.string()).max(8),
  stack: z.array(z.string()).max(12),
  tone: z.string(),
  url: z.string().optional(),
  repoUrl: z.string().optional(),
});
export type Brief = z.infer<typeof briefSchema>;

export const previewSchema = z.object({
  tagline: z.string().min(1),
  xPost: z.string().min(1),
});
export type Preview = z.infer<typeof previewSchema>;

export const kitContentSchema = z.object({
  landing: z.object({
    headline: z.string().min(1),
    subheadline: z.string().min(1),
    cta: z.string().min(1),
    features: z
      .array(z.object({ title: z.string().min(1), description: z.string().min(1) }))
      .min(3)
      .max(6),
    metaTitle: z.string().min(1),
    metaDescription: z.string().min(1),
  }),
  productHunt: z.object({
    name: z.string().min(1),
    tagline: z.string().min(1),
    description: z.string().min(1),
    makerComment: z.string().min(1),
    topics: z.array(z.string()).max(4),
  }),
  xThread: z.array(z.string().min(1)).min(3).max(10),
  linkedin: z.string().min(1),
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
