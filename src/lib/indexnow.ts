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

/**
 * Paths to ping for a list of changed repo files: blog posts, guides and tools, each with the hub that lists it
 * (/blog, /guides, /tools). Everything else is ignored. The result still has to be matched against the live sitemap.
 */
export function changedPaths(files: readonly string[], guideSlugs: readonly string[]): string[] {
  const paths = new Set<string>();
  const guides = () => {
    paths.add("/guides");
    for (const slug of guideSlugs) paths.add(`/${slug}`);
  };
  for (const file of files) {
    const registry = REGISTRIES[file];
    if (registry === "guides") guides();
    else if (registry) paths.add(`/${registry}`).add(SECTION_ALL[registry]);

    const route = routeOf(file);
    if (!route) continue;
    const top = route.split("/")[1];
    if (top === "blog" || top === "tools" || top === "guides") {
      paths.add(route);
      for (const parent of parents(route)) paths.add(parent);
    } else if (guideSlugs.includes(top)) {
      paths.add(`/${top}`).add("/guides");
    }
  }
  return [...paths].sort();
}

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
      paths.push(item.length > 1 ? item.replace(/\/+$/, "") : item);
      continue;
    }
    try {
      const url = new URL(item);
      if (url.origin === INDEXNOW_ORIGIN) paths.push(url.pathname);
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
