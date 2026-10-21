/**
 * IndexNow: tells Bing, Yandex, Seznam and Naver which URLs changed after a production deploy.
 * See docs/seo/indexnow.md. scripts/indexnow.mts runs this under plain Node (type stripping), so keep this module
 * free of imports.
 */

/** Public by design: IndexNow checks it at INDEXNOW_KEY_LOCATION. public/<key>.txt must contain exactly this. */
export const INDEXNOW_KEY = "c9d6f1fc7beeb58d4c9f499fb37684a9";

export const INDEXNOW_HOST = "launchloop.dev";
export const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`;
export const INDEXNOW_KEY_LOCATION = `${INDEXNOW_ORIGIN}/${INDEXNOW_KEY}.txt`;
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** IndexNow accepts 10,000 per request; a real deploy touches a handful, so a big batch means something is off. */
export const INDEXNOW_MAX_URLS = 100;

/** Content registries: a change can touch any page in the section, so it selects the whole section. */
const REGISTRIES: Record<string, "blog" | "guides" | "tools"> = {
  "src/lib/blog.ts": "blog",
  "src/lib/guides.ts": "guides",
  "src/lib/tools.ts": "tools",
};

/** A trailing "/*" selects every sitemap path under that prefix. */
const SECTION_ALL = { blog: "/blog/*", tools: "/tools/*" } as const;

/**
 * The public path a file under src/app renders, or null for files outside the app router and file routes like
 * rss.xml. Route groups are dropped; a dynamic segment, parallel slot or private folder stops at its parent.
 */
export function routeOf(file: string): string | null {
  if (!file.startsWith("src/app/")) return null;
  const route: string[] = [];
  for (const segment of file.slice("src/app/".length).split("/").slice(0, -1)) {
    if (segment.startsWith("(") && segment.endsWith(")")) continue;
    if (/^[[@_]/.test(segment)) break;
    if (segment.includes(".")) return null;
    route.push(segment);
  }
  return `/${route.join("/")}`;
}

/** /blog/a/b gives /blog/a and /blog. The home page is never a parent: it doesn't list posts. */
function parents(path: string): string[] {
  const segments = path.split("/").filter(Boolean);
  return segments.slice(1).map((_, i) => `/${segments.slice(0, segments.length - 1 - i).join("/")}`);
}

/** The blog, guide or tool page a file belongs to, or null for files outside those sections. */
function pageOf(file: string, guideSlugs: readonly string[]): string | null {
  const route = routeOf(file);
  if (!route) return null;
  const top = route.split("/")[1];
  if (top === "blog" || top === "tools" || top === "guides") return route;
  return guideSlugs.includes(top) ? `/${top}` : null;
}

/**
 * Paths to ping for a list of changed repo files: blog posts, guides and tools, each with the hub that lists it
 * (/blog, /guides, /tools). Everything else is ignored. The result still has to be matched against the live sitemap.
 */
export function changedPaths(files: readonly string[], guideSlugs: readonly string[]): string[] {
  const paths = new Set<string>();
  for (const file of files) {
    const registry = REGISTRIES[file];
    if (registry === "guides") for (const path of ["/guides", ...guideSlugs.map((slug) => `/${slug}`)]) paths.add(path);
    else if (registry) paths.add(`/${registry}`).add(SECTION_ALL[registry]);

    const page = pageOf(file, guideSlugs);
    if (!page) continue;
    paths.add(page);
    for (const parent of parents(page)) paths.add(parent);
    if (guideSlugs.includes(page.slice(1))) paths.add("/guides");
  }
  return [...paths].sort();
}

/**
 * Splits `git diff --name-status` output into paths that changed and pages that may have been removed. A deleted or
 * renamed-away file's own page goes in `removed`, unless a file that still exists maps to it too; its parents and hub
 * go in `changed`, since they list it.
 */
export function diffPaths(nameStatus: string, guideSlugs: readonly string[]): { changed: string[]; removed: string[] } {
  const current: string[] = [];
  const gone: string[] = [];
  for (const line of nameStatus.split("\n")) {
    const [status, ...files] = line.trim().split("\t");
    if (!files.length) continue;
    if (status.startsWith("D")) gone.push(files[0]);
    else if (status.startsWith("R")) {
      gone.push(files[0]);
      current.push(files[1]);
    } else current.push(files[files.length - 1]);
  }
  const live = new Set(changedPaths(current, guideSlugs));
  const changed = new Set(live);
  const removed = new Set<string>();
  for (const file of gone) {
    const page = pageOf(file, guideSlugs);
    for (const path of changedPaths([file], guideSlugs)) {
      if (path === page && !live.has(path)) removed.add(path);
      else changed.add(path);
    }
  }
  // The caller checks removed pages both ways (live, or 404 / 410), so they never wait to go live.
  for (const path of removed) changed.delete(path);
  return { changed: [...changed].sort(), removed: [...removed].sort() };
}

/** IndexNow wants removed pages too, once they answer 404 or 410. */
export const isGone = (status: number) => status === 404 || status === 410;

/** "/blog/" and "/blog" are one page: the proxy redirects the slash form, and the sitemap uses the bare one. */
const normalisePath = (path: string) => path.replace(/\/+$/, "") || "/";

/** Same-host paths listed in a sitemap.xml, in sitemap order. */
export function sitemapPaths(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].flatMap((m) => {
    try {
      const url = new URL(m[1]);
      return url.origin === INDEXNOW_ORIGIN ? [url.pathname] : [];
    } catch {
      return [];
    }
  });
}

/** The candidates that are in the sitemap, in sitemap order, with "/prefix/*" expanded. */
export function inSitemap(candidates: readonly string[], sitemap: readonly string[]): string[] {
  const exact = new Set(candidates.filter((c) => !c.endsWith("/*")));
  const prefixes = candidates.filter((c) => c.endsWith("/*")).map((c) => c.slice(0, -1));
  return [...new Set(sitemap)].filter((path) => exact.has(path) || prefixes.some((prefix) => path.startsWith(prefix)));
}

/**
 * Paths from a manual list of URLs or paths, separated by spaces, commas or new lines. Full URLs must be on
 * launchloop.dev; anything else comes back in `rejected`.
 */
export function parseUrlList(input: string): { paths: string[]; rejected: string[] } {
  const paths: string[] = [];
  const rejected: string[] = [];
  for (const item of input.split(/[\s,]+/).filter(Boolean)) {
    if (item.startsWith("/")) {
      paths.push(normalisePath(item));
      continue;
    }
    try {
      const url = new URL(item);
      if (url.origin === INDEXNOW_ORIGIN) paths.push(normalisePath(url.pathname));
      else rejected.push(item);
    } catch {
      rejected.push(item);
    }
  }
  return { paths: [...new Set(paths)], rejected };
}

export const absoluteUrl = (path: string) => `${INDEXNOW_ORIGIN}${path}`;

/** The IndexNow request body for a batch of paths, capped at INDEXNOW_MAX_URLS. */
export function indexNowBody(paths: readonly string[]) {
  return { host: INDEXNOW_HOST, key: INDEXNOW_KEY, keyLocation: INDEXNOW_KEY_LOCATION, urlList: paths.slice(0, INDEXNOW_MAX_URLS).map(absoluteUrl) };
}

/** 200 is accepted; 202 means accepted while the key is still being verified. */
export const indexNowAccepted = (status: number) => status === 200 || status === 202;
