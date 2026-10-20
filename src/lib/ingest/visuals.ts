import "server-only";
import type { KitImageFormat, KitImageRef, KitVisuals } from "../schema";
import { githubApiUrl, githubAuthHeaders, type RepoData } from "./github";
import { imageSize } from "./image-size";
import { safeFetch, safeFetchBytes } from "./safe-fetch";
import type { SiteData } from "./site";

/** The whole lookup (tree listing plus every probe) runs inside this, in parallel with the palette. */
export const VISUALS_BUDGET_MS = 3000;
/** A probe reads this much: enough for any raster header and for a whole small SVG. */
export const PROBE_BYTES = 128_000;
export const MAX_SCREENSHOT_BYTES = 3_000_000;
export const MAX_LOGO_BYTES = 400_000;
const MAX_SIDE = 4096;
const TREE_BYTES = 1_500_000;

type Kind = "screenshot" | "logo";
type Candidate = { url: string; source: KitImageRef["source"] };

const RASTER: KitImageFormat[] = ["png", "jpeg", "webp", "gif"];

/** Badges, charts, buttons and other README furniture that is never the product itself. */
const NOT_A_SHOT_HOST =
  /(^|\.)(shields\.io|badgen\.net|badge\.fury\.io|codecov\.io|coveralls\.io|travis-ci\.(com|org)|circleci\.com|contrib\.rocks|opencollective\.com|star-history\.com|repobeats\.axiom\.co|api\.producthunt\.com|trendshift\.io|deepwiki\.com|gitpod\.io|sonarcloud\.io|snyk\.io|fossa\.com|img\.youtube\.com|i\.ytimg\.com|vercel\.com|railway\.app|render\.com|heroku\.com|netlify\.com|discord(app)?\.com|launchloop\.dev)$/i;
const NOT_A_SHOT_WORDS = /badge|logo|icon|avatar|sponsor|thumb|banner|button|star[-_ ]?history|contributors|deploy|video|play|youtube|wordmark/i;

const rawUrl = (owner: string, name: string, path: string) =>
  `https://raw.githubusercontent.com/${owner}/${name}/HEAD/${path.replace(/^\.?\//, "").split("/").map(encodeURIComponent).join("/")}`;

/** README image references in document order, resolved to fetchable URLs (relative paths point into the repo). */
export function readmeImages(readme: string, owner: string, name: string): { url: string; alt: string }[] {
  const found: { index: number; src: string; alt: string }[] = [];
  for (const m of readme.matchAll(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g)) found.push({ index: m.index, src: m[2], alt: m[1] });
  for (const m of readme.matchAll(/<img\b[^>]*>/gi)) {
    const src = m[0].match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) found.push({ index: m.index, src, alt: m[0].match(/\salt\s*=\s*["']([^"']*)["']/i)?.[1] ?? "" });
  }
  const out: { url: string; alt: string }[] = [];
  for (const { src, alt } of found.sort((a, b) => a.index - b.index)) {
    let url: string;
    if (/^https?:\/\//i.test(src)) {
      const blob = src.match(/^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(?:blob|raw)\/([^?#]+)/i);
      url = blob ? `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}` : src;
    } else if (/^[a-z][\w+.-]*:/i.test(src) || src.startsWith("//") || src.startsWith("#")) continue;
    else url = rawUrl(owner, name, src.split(/[?#]/)[0]);
    out.push({ url, alt });
  }
  return out;
}

/** README images that could be a product shot: no badges, logos, charts or video thumbnails, and no SVG. */
export function readmeShots(readme: string, owner: string, name: string): string[] {
  return readmeImages(readme, owner, name)
    .filter(({ url, alt }) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return false;
      }
      if (NOT_A_SHOT_HOST.test(parsed.hostname)) return false;
      if (/\.svg$/i.test(parsed.pathname) || /\/badge|\/workflows\//i.test(parsed.pathname)) return false;
      return !NOT_A_SHOT_WORDS.test(alt) && !NOT_A_SHOT_WORDS.test(decodeURIComponent(parsed.pathname));
    })
    .map((i) => i.url);
}

const IMAGE_FILE = /\.(png|jpe?g|webp|gif|svg)$/i;
const SHOT_NAME = /(^|[/_.-])(screenshots?|screen|hero|preview|demo|dashboard|product|app[-_]?shot|showcase)([/_.-]|$)/i;
const OG_NAME = /(^|\/)(og|og[-_]image|opengraph[-_]image|social[-_](card|preview|image)|twitter[-_]image)\.(png|jpe?g|webp)$/i;
const LOGO_NAME = /(^|\/)(logo|logomark|mark|icon|app[-_]icon|apple[-_]touch[-_]icon|favicon|brand)([-_.](\d+|light|dark|square|mark|icon|x\d+|\d+x\d+))*\.(svg|png|jpe?g|webp)$/i;
const SKIP_DIR = /(^|\/)(node_modules|vendor|test|tests|__tests__|fixtures|examples?|\.agents|\.cursor|\.claude|skills|third[-_]party|locales?)\//i;
const ASSET_DIR = /^(?:(?:apps|packages)\/[^/]+\/)?(?:public|static|assets|images|img|media|docs|\.github|app|src\/app|src\/assets|website)\//i;

/** Lower is better: root assets before workspace apps and packages, shallow paths before deep ones. */
function pathRank(path: string): number {
  const workspace = /^(apps|packages)\//.test(path) ? (/^apps\/(web|www|site|landing|marketing|app)\//.test(path) ? 1 : 2) : 0;
  return workspace * 100 + path.split("/").length;
}

/** From the repo's file list, likely product screenshots, share images and logos (best first). */
export function repoImageFiles(paths: Iterable<string>): { shots: string[]; ogs: string[]; logos: string[] } {
  const shots: string[] = [];
  const ogs: string[] = [];
  const logos: string[] = [];
  for (const path of paths) {
    if (!IMAGE_FILE.test(path) || SKIP_DIR.test(path)) continue;
    const inAssets = ASSET_DIR.test(path) || !path.includes("/");
    if (OG_NAME.test(path) && inAssets) ogs.push(path);
    else if (SHOT_NAME.test(path) && !/\.svg$/i.test(path) && inAssets) shots.push(path);
    else if (LOGO_NAME.test(path) && inAssets) logos.push(path);
  }
  const byRank = (a: string, b: string) => pathRank(a) - pathRank(b) || a.localeCompare(b);
  const logoRank = (p: string) => (/logo/i.test(p) ? 0 : /apple[-_]touch/i.test(p) ? 1 : /icon/i.test(p) ? 2 : 3) * 1000 + (/\.svg$/i.test(p) ? 0 : 1) * 10;
  return { shots: shots.sort(byRank), ogs: ogs.sort(byRank), logos: logos.sort((a, b) => logoRank(a) - logoRank(b) || byRank(a, b)) };
}

/** Blob paths from a git tree listing. Regex rather than JSON.parse, so a listing cut off at the byte cap still yields paths. */
export function treePaths(listing: string): string[] {
  return [...listing.matchAll(/"path"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"mode"\s*:\s*"\d+"\s*,\s*"type"\s*:\s*"blob"/g)].map((m) => JSON.parse(`"${m[1]}"`) as string);
}

/** Shape and size rules: a screenshot is a real landscape capture; a logo is a square-ish mark. */
export function fits(kind: Kind, format: KitImageFormat, width: number, height: number): boolean {
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > 16_000_000) return false;
  const ratio = width / height;
  if (kind === "screenshot") return RASTER.includes(format) && width >= 600 && height >= 300 && ratio >= 1.2 && ratio <= 2.4;
  return (format === "svg" || Math.min(width, height) >= 64) && ratio >= 0.8 && ratio <= 1.25;
}

async function probe(candidate: Candidate, kind: Kind): Promise<KitImageRef | null> {
  try {
    const res = await safeFetchBytes(candidate.url, {
      accept: "image/png,image/jpeg,image/webp,image/gif,image/svg+xml;q=0.9,*/*;q=0.1",
      maxBytes: PROBE_BYTES,
      timeoutMs: 4000,
    });
    if (res.status >= 400) return null;
    const size = imageSize(res.bytes, res.contentType);
    if (size.format === "unknown" || size.format === "avif" || !size.width || !size.height) return null;
    if (size.format === "svg" && res.truncated) return null;
    const cap = kind === "screenshot" ? MAX_SCREENSHOT_BYTES : MAX_LOGO_BYTES;
    if (res.contentLength && res.contentLength > cap) return null;
    if (!fits(kind, size.format, size.width, size.height)) return null;
    return { url: candidate.url, width: size.width, height: size.height, format: size.format, source: candidate.source };
  } catch {
    return null;
  }
}

/**
 * Ranked groups of candidates, some known up front (README, live page) and some only once the repo
 * tree arrives. Every group starts probing as soon as it is known; the winner is the first passing
 * candidate in rank order among the probes that finished.
 */
class Picker {
  private groups: { candidates: Candidate[]; results: (KitImageRef | null | undefined)[] }[] = [];
  private pending: Promise<unknown>[] = [];
  private seen = new Set<string>();
  constructor(private kind: Kind) {}

  /** Reserves a rank slot now, so groups that resolve later still sort where they belong. */
  slot(): (candidates: Candidate[], max: number) => void {
    const group = { candidates: [] as Candidate[], results: [] as (KitImageRef | null | undefined)[] };
    this.groups.push(group);
    return (candidates, max) => {
      group.candidates = candidates.filter((c) => !this.seen.has(c.url) && this.seen.add(c.url)).slice(0, max);
      group.results = group.candidates.map(() => undefined);
      this.pending.push(...group.candidates.map((c, i) => probe(c, this.kind).then((r) => (group.results[i] = r))));
    };
  }

  settled = () => Promise.all(this.pending);
  best = () => this.groups.flatMap((g) => g.results).find((r): r is KitImageRef => !!r);
}

async function repoTree(repo: RepoData): Promise<string[]> {
  try {
    const res = await safeFetch(githubApiUrl(`/repos/${repo.owner}/${repo.name}/git/trees/HEAD?recursive=1`), {
      accept: "application/vnd.github+json",
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
      originHeaders: githubAuthHeaders(),
      maxBytes: TREE_BYTES,
      timeoutMs: 2500,
    });
    return res.status === 200 ? treePaths(res.text) : [];
  } catch {
    return [];
  }
}

/** Best effort: a product screenshot and a logo for the kit images, or nothing, never slower than the budget. */
export async function discoverVisuals(repo: RepoData | undefined, site: SiteData | undefined, budgetMs = VISUALS_BUDGET_MS): Promise<KitVisuals> {
  const shots = new Picker("screenshot");
  const logos = new Picker("logo");
  const readmeSlot = shots.slot();
  const repoShotSlot = shots.slot();
  const siteOgSlot = shots.slot();
  const repoOgSlot = shots.slot();
  const iconSlot = logos.slot();
  const avatarSlot = logos.slot();
  const repoLogoSlot = logos.slot();

  readmeSlot(repo?.readme ? readmeShots(repo.readme, repo.owner, repo.name).map((url) => ({ url, source: "readme" })) : [], 3);
  siteOgSlot(site?.ogImage && !/launchloop\.dev/i.test(site.ogImage) ? [{ url: site.ogImage, source: "site" }] : [], 1);
  iconSlot((site?.icons ?? []).map((url) => ({ url, source: "site" })), 3);
  avatarSlot(repo?.orgAvatarUrl ? [{ url: repo.orgAvatarUrl, source: "avatar" }] : [], 1);
  const fromTree = (async () => {
    if (!repo) return;
    const files = repoImageFiles(await repoTree(repo));
    const fromRepo = (paths: string[]): Candidate[] => paths.map((p) => ({ url: rawUrl(repo.owner, repo.name, p), source: "repo" }));
    repoShotSlot(fromRepo(files.shots), 2);
    repoOgSlot(fromRepo(files.ogs), 1);
    repoLogoSlot(fromRepo(files.logos), 2);
  })();

  let timer: NodeJS.Timeout | undefined;
  const budget = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, budgetMs);
  });
  try {
    await Promise.race([fromTree.then(() => Promise.all([shots.settled(), logos.settled()])).catch(() => {}), budget]);
  } finally {
    clearTimeout(timer);
  }
  const screenshot = shots.best();
  const logo = logos.best();
  return { ...(screenshot && { screenshot }), ...(logo && { logo }) };
}
