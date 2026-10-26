import "server-only";
import type { Palette } from "../schema";
import { DEFAULT_PALETTE, extractPalette } from "./colors";
import { cappedText, encodeRepoFile, gh, repoApiPath } from "./github";
import { readCappedText } from "./safe-fetch";
import { TREE_BYTES, treePaths } from "./visuals";

/** One tree listing plus at most one file per kind, all inside this budget, so a preview barely slows down. */
export const REPO_PALETTE_BUDGET_MS = 2500;
const FILE_CAP = 40_000;

type Kind = "manifest" | "css" | "tailwind" | "icon";

/** In priority order within each kind. */
const CANDIDATES: Record<Kind, string[]> = {
  manifest: ["public/manifest.json", "public/site.webmanifest", "site.webmanifest", "public/manifest.webmanifest", "app/manifest.ts", "src/app/manifest.ts"],
  css: ["src/styles.css", "src/index.css", "src/app/globals.css", "app/globals.css", "styles/globals.css"],
  tailwind: ["tailwind.config.ts", "tailwind.config.js", "tailwind.config.mjs", "tailwind.config.cjs"],
  icon: ["public/favicon.svg", "src/app/icon.svg", "app/icon.svg"],
};
const KINDS = Object.keys(CANDIDATES) as Kind[];

/** Root first, then the app most likely to be the marketing site, then other workspace apps and packages. */
function prefixRank(prefix: string): number {
  if (prefix === "") return 0;
  if (/^apps\/(web|www|site|landing|marketing|frontend|app)\/$/.test(prefix)) return 1;
  if (prefix.startsWith("apps/")) return 2;
  return 3;
}

/** From a repo's file list, the best colour source of each kind (at most one per kind). */
export function pickColourFiles(paths: Iterable<string>): string[] {
  const best = new Map<Kind, { path: string; rank: number }>();
  for (const path of paths) {
    const m = path.match(/^((?:apps|packages)\/[^/]+\/)?(.+)$/);
    if (!m) continue;
    const prefix = m[1] ?? "";
    const rest = m[2];
    for (const kind of KINDS) {
      const index = CANDIDATES[kind].indexOf(rest);
      if (index < 0) continue;
      const rank = prefixRank(prefix) * 100 + index;
      const current = best.get(kind);
      if (!current || rank < current.rank || (rank === current.rank && path < current.path)) best.set(kind, { path, rank });
    }
  }
  return KINDS.flatMap((kind) => best.get(kind)?.path ?? []);
}

const manifestField = (text: string, field: string) => text.match(new RegExp(`["']?${field}["']?\\s*:\\s*["'\`]([^"'\`]+)`))?.[1];

/**
 * Turns fetched repo files into a palette. The manifest's theme_color is the accent hint; its
 * background_color only counts when no stylesheet declares --background.
 */
export function paletteFromRepoFiles(files: { path: string; text: string }[]): Palette {
  let themeColor: string | undefined;
  let manifestBackground: string | undefined;
  const css: string[] = [];
  for (const { path, text } of files) {
    if (/manifest|webmanifest/.test(path)) {
      themeColor ??= manifestField(text, "theme_color");
      manifestBackground ??= manifestField(text, "background_color");
    } else css.push(text);
  }
  if (manifestBackground) css.push(`--background: ${manifestBackground};`);
  if (!themeColor && css.length === 0) return DEFAULT_PALETTE;
  return extractPalette({ css: css.join("\n"), themeColor }, "repo");
}

/** Best effort: any GitHub error, timeout or missing file just means the default palette. */
export async function fetchRepoPalette(owner: string, name: string): Promise<Palette> {
  const signal = AbortSignal.timeout(REPO_PALETTE_BUDGET_MS);
  try {
    const repo = repoApiPath(owner, name);
    const treeRes = await gh(`${repo}/git/trees/HEAD?recursive=1`, undefined, signal);
    if (!treeRes.ok) return DEFAULT_PALETTE;
    // A listing cut off at the cap isn't valid JSON, but its complete entries still are.
    const { text, truncated } = await readCappedText(treeRes, TREE_BYTES);
    const listed = truncated ? treePaths(text) : ((JSON.parse(text) as { tree?: { path?: string; type?: string }[] }).tree ?? []).filter((e) => e.type === "blob" && e.path).map((e) => e.path!);
    const paths = pickColourFiles(listed);
    if (paths.length === 0) return DEFAULT_PALETTE;
    const files = await Promise.all(
      paths.map(async (path) => {
        try {
          const res = await gh(`${repo}/contents/${encodeRepoFile(path)}`, "application/vnd.github.raw+json", signal);
          return res.ok ? { path, text: await cappedText(res, FILE_CAP) } : null;
        } catch {
          return null;
        }
      }),
    );
    return paletteFromRepoFiles(files.filter((f) => f !== null));
  } catch {
    return DEFAULT_PALETTE;
  }
}
