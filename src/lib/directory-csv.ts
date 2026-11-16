import { z } from "zod";

/** No server-only or fs: the e2e leak test parses the file with this too. The data itself is only read by directories.ts. */

export const DIRECTORY_COLUMNS = [
  "rank",
  "name",
  "url",
  "submit_url",
  "category",
  "pricing",
  "price_usd",
  "badge_required",
  "backlink_required",
  "dofollow",
  "dr",
  "approval_time",
  "tagline_max",
  "description_max",
  "notes",
  "utm_source",
] as const;

/** Optional trailing columns: the free page's public facts, so it never reads notes. A file may leave both out. */
export const OPTIONAL_DIRECTORY_COLUMNS = ["last_verified", "our_submission"] as const;

/** The public top-20 on /free-startup-directories. */
export const FREE_LIST_SIZE = 20;

const wholeOrBlank = z
  .string()
  .regex(/^\d*$/, "must be a whole number or blank")
  .transform((v) => (v === "" ? null : Number(v)));
const yesNo = z.enum(["yes", "no", "unknown"]);
const httpUrl = z.url({ protocol: /^https?$/, error: "must be an http(s) URL" });

const rowSchema = z.object({
  rank: z
    .string()
    .regex(/^[1-9]\d*$/, "must be a positive whole number")
    .transform(Number),
  name: z.string().min(1, "is empty"),
  url: httpUrl,
  submit_url: z.union([z.literal(""), httpUrl]),
  category: z.string(),
  pricing: z.enum(["free", "freemium", "paid"]),
  price_usd: wholeOrBlank,
  badge_required: yesNo,
  backlink_required: yesNo,
  dofollow: yesNo,
  dr: wholeOrBlank,
  approval_time: z.string(),
  tagline_max: wholeOrBlank,
  description_max: wholeOrBlank,
  notes: z.string(),
  utm_source: z.string().regex(/^[a-z0-9_.-]+$/, "must be a lowercase slug"),
  /** The day the row was last checked (the "checked YYYY-MM-DD" in our notes). */
  last_verified: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "must be YYYY-MM-DD or blank"),
  /** What happened when we submitted LaunchLoop (the "Our experience:" sentence in our notes), or blank. */
  our_submission: z.string(),
});

export type Directory = z.output<typeof rowSchema>;

export class DirectoryCsvError extends Error {
  constructor(public readonly issues: string[]) {
    super(`directories.csv is malformed:\n${issues.join("\n")}`);
    this.name = "DirectoryCsvError";
  }
}

/** RFC 4180: quoted fields may hold commas, quotes ("") and line breaks. */
function csvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') field += text[++i];
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += c;
  }
  if (field || record.length) records.push([...record, field]);
  return records;
}

/** Every row, in file order. Throws DirectoryCsvError listing each bad row by rank (or line) and why. */
export function parseDirectories(text: string): Directory[] {
  const [header, ...records] = csvRecords(text.replace(/^\uFEFF/, ""));
  const columns = [DIRECTORY_COLUMNS, ALL_COLUMNS].find((c) => header?.join(",") === c.join(","));
  if (!columns) throw new DirectoryCsvError([`header must be exactly: ${DIRECTORY_COLUMNS.join(",")} (optionally followed by ,${OPTIONAL_DIRECTORY_COLUMNS.join(",")})`]);
  const issues: string[] = [];
  const rows: Directory[] = [];
  const ranks = new Set<number>();
  records.forEach((record, i) => {
    const where = `line ${i + 2}`;
    if (record.length !== columns.length) {
      issues.push(`${where}: ${record.length} columns, expected ${columns.length}`);
      return;
    }
    const raw: Record<string, string> = { last_verified: "", our_submission: "", ...Object.fromEntries(columns.map((column, j) => [column, record[j].trim()])) };
    const label = /^\d+$/.test(raw.rank) ? `rank ${raw.rank}` : where;
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) issues.push(`${label}: ${issue.path.join(".")} ${issue.message} (got "${raw[String(issue.path[0])]}")`);
      return;
    }
    if (ranks.has(parsed.data.rank)) issues.push(`${label}: duplicate rank`);
    ranks.add(parsed.data.rank);
    rows.push(parsed.data);
  });
  if (issues.length) throw new DirectoryCsvError(issues);
  return rows;
}

const csvField = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const ALL_COLUMNS = [...DIRECTORY_COLUMNS, ...OPTIONAL_DIRECTORY_COLUMNS];

/** The database as CSV, every column, with `extra` columns (the buyer's link and copy) appended when given. */
export function directoriesCsv(rows: Directory[], extra?: (row: Directory) => Record<string, string>): string {
  const extraColumns = extra && rows.length ? Object.keys(extra(rows[0])) : [];
  const lines = [
    [...ALL_COLUMNS, ...extraColumns].join(","),
    ...rows.map((row) => {
      const added = extra ? extra(row) : {};
      return [...ALL_COLUMNS.map((c) => row[c]), ...extraColumns.map((c) => added[c])].map(csvField).join(",");
    }),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export const submitUrl = (row: Pick<Directory, "submit_url" | "url">) => row.submit_url || row.url;

/** The buyer's own URL to paste into a directory's form, tagged so its visits show up by directory. */
export function utmLink(productUrl: string, row: Pick<Directory, "utm_source">): string {
  const url = new URL(productUrl);
  url.searchParams.set("utm_source", row.utm_source);
  url.searchParams.set("utm_medium", "directory");
  return url.toString();
}

/** The SEO brief's fixed set of types. */
export type DirectoryType = "launch board" | "alternatives catalogue" | "community" | "review site" | "evergreen directory";

const TYPES: Record<string, DirectoryType> = {
  launchpad: "launch board",
  alternatives: "alternatives catalogue",
  community: "community",
  "software-reviews": "review site",
};

/** A free-page row: only these derived columns are public. Nothing comes from notes. */
export interface FreeDirectoryRow {
  rank: number;
  name: string;
  url: string;
  type: DirectoryType;
  freeRoute: string;
  queue: string;
  badge: "yes" | "no" | "not stated";
  /** The CSV doesn't record who checked a live listing, so the brief's rule leaves every row "not checked". */
  linkType: "not checked";
  submit: string;
  lastVerified: string;
  ourSubmission: "" | "submitted" | "queued" | "live" | "skipped";
}

/** The brief's fixed set, from the our_submission text. */
function ourSubmission(experience: string): FreeDirectoryRow["ourSubmission"] {
  if (/\blive\b/.test(experience)) return "live";
  if (/\b(booked|queued|pending|free date)\b/.test(experience)) return "queued";
  if (/\bskipped\b/.test(experience)) return "skipped";
  if (/\bsubmitted\b/.test(experience)) return "submitted";
  return "";
}

function badgeRule({ badge_required, backlink_required }: Pick<Directory, "badge_required" | "backlink_required">): FreeDirectoryRow["badge"] {
  if (badge_required === "yes" || backlink_required === "yes") return "yes";
  return badge_required === "no" && backlink_required === "no" ? "no" : "not stated";
}

function freeRoute(pricing: Directory["pricing"]): string {
  switch (pricing) {
    case "free":
      return "Free listing";
    case "freemium":
      return "Free listing, paid upgrades optional";
    case "paid":
      return "No free route";
    default: {
      const unhandled: never = pricing;
      return unhandled;
    }
  }
}

export function freeDirectoryRow(row: Directory): FreeDirectoryRow {
  return {
    rank: row.rank,
    name: row.name,
    url: row.url,
    type: TYPES[row.category] ?? "evergreen directory",
    freeRoute: freeRoute(row.pricing),
    queue: row.approval_time || "not stated",
    badge: badgeRule(row),
    linkType: "not checked",
    submit: submitUrl(row),
    lastVerified: row.last_verified,
    ourSubmission: ourSubmission(row.our_submission),
  };
}
