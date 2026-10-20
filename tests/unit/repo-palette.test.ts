import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteData } from "@/lib/ingest/site";

const site = vi.hoisted(() => ({ fetchSite: vi.fn() }));
vi.mock("@/lib/ingest/site", () => ({ fetchSite: site.fetchSite }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), captureExceptionThrottled: vi.fn(), captureMessage: vi.fn(), addBreadcrumb: vi.fn() }));

const { contrast, hexToRgb, DEFAULT_PALETTE } = await import("@/lib/ingest/colors");
const { paletteFromRepoFiles, pickColourFiles, REPO_PALETTE_BUDGET_MS } = await import("@/lib/ingest/repo-palette");
const { ingest, IngestError } = await import("@/lib/ingest");

// Real files from github.com/luciengeorge/haypile (src/styles.css, public/manifest.json).
const fixtures = path.join(import.meta.dirname, "../fixtures/haypile");
const HAYPILE_CSS = await readFile(path.join(fixtures, "styles.css"), "utf8");
const HAYPILE_MANIFEST = await readFile(path.join(fixtures, "manifest.json"), "utf8");
const HAYPILE_TREE = ["README.md", "package.json", "public/favicon.ico", "public/manifest.json", "src/styles.css", "src/routes/index.tsx"];

/** A fake api.github.com for one repo; `files` maps repo paths to contents. Every request is recorded. */
function fakeGitHub(files: Record<string, string>, tree = Object.keys(files)) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    calls.push(url.pathname + url.search);
    const p = url.pathname;
    const respond = (body: string, status = 200) => new Response(body, { status });
    if (p === "/repos/luciengeorge/haypile") return respond(JSON.stringify({ html_url: "https://github.com/luciengeorge/haypile", homepage: "https://haypile.app" }));
    if (p === "/repos/luciengeorge/haypile/commits") return respond(JSON.stringify([{ sha: "abc123", commit: { message: "ship", author: { date: "2026-10-18T00:00:00Z" } } }]));
    if (p === "/repos/luciengeorge/haypile/readme") return respond("# Haypile\n\nSearch everything you saved.");
    if (p === "/repos/luciengeorge/haypile/git/trees/HEAD") return respond(JSON.stringify({ tree: tree.map((path) => ({ path, type: "blob" })) }));
    const file = p.match(/^\/repos\/luciengeorge\/haypile\/contents\/(.+)$/)?.[1];
    if (file && file in files) return respond(files[file]);
    return respond("Not Found", 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  const paletteCalls = () => calls.filter((c) => c.includes("/git/trees/") || (c.includes("/contents/") && !c.endsWith("/package.json")));
  return { calls, paletteCalls };
}

const siteWithoutColours = (): SiteData => ({ url: "https://haypile.app/", title: "Haypile", headings: [], paragraphs: [], listItems: [], prices: [], css: "" });

beforeEach(() => {
  vi.stubEnv("GITHUB_API_URL", "https://api.github.test");
  site.fetchSite.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("palette from repo files", () => {
  it("reads haypile's brand from its real styles.css and web manifest", () => {
    const palette = paletteFromRepoFiles([
      { path: "public/manifest.json", text: HAYPILE_MANIFEST },
      { path: "src/styles.css", text: HAYPILE_CSS },
    ]);
    expect(palette).toMatchObject({ source: "repo", background: "#f2eee5", accent: "#2e7d6e" });
  });

  it("uses the manifest alone when there is no stylesheet", () => {
    expect(paletteFromRepoFiles([{ path: "public/manifest.json", text: HAYPILE_MANIFEST }])).toMatchObject({ source: "repo", background: "#f2eee5", accent: "#2e7d6e" });
  });

  it("reads theme_color from an app/manifest.ts", () => {
    const ts = `export default function manifest() { return { name: "X", theme_color: "#2e7d6e", background_color: "#f2eee5" }; }`;
    expect(paletteFromRepoFiles([{ path: "app/manifest.ts", text: ts }])).toMatchObject({ source: "repo", accent: "#2e7d6e" });
  });

  it("falls back to the default when no file has a usable colour", () => {
    expect(paletteFromRepoFiles([])).toEqual(DEFAULT_PALETTE);
    expect(paletteFromRepoFiles([{ path: "src/index.css", text: "body { margin: 0; color: #111; }" }])).toEqual(DEFAULT_PALETTE);
  });

  it("picks one file per kind, preferring the root, then the web app, over other packages", () => {
    expect(pickColourFiles(HAYPILE_TREE)).toEqual(["public/manifest.json", "src/styles.css"]);
    expect(
      pickColourFiles([
        "packages/ui/src/styles.css",
        "apps/docs/app/globals.css",
        "apps/web/app/globals.css",
        "apps/web/public/site.webmanifest",
        "apps/web/tailwind.config.ts",
        "apps/web/app/icon.svg",
        "public/favicon.svg",
        "src/components/button.css",
      ]),
    ).toEqual(["apps/web/public/site.webmanifest", "apps/web/app/globals.css", "apps/web/tailwind.config.ts", "public/favicon.svg"]);
  });
});

describe("neutral default palette", () => {
  it("is light and neutral, not a brand colour", () => {
    expect(DEFAULT_PALETTE).toEqual({ background: "#f5f5f4", foreground: "#1c1917", accent: "#57534e", accentForeground: "#ffffff", muted: "#625d57", source: "default" });
  });

  it("keeps image text readable", () => {
    const c = (a: string, b: string) => contrast(hexToRgb(a), hexToRgb(b));
    expect(c(DEFAULT_PALETTE.foreground, DEFAULT_PALETTE.background)).toBeGreaterThanOrEqual(7);
    expect(c(DEFAULT_PALETTE.muted, DEFAULT_PALETTE.background)).toBeGreaterThanOrEqual(4.5);
    expect(c(DEFAULT_PALETTE.accentForeground, DEFAULT_PALETTE.accent)).toBeGreaterThanOrEqual(4.5);
    expect(c(DEFAULT_PALETTE.accent, DEFAULT_PALETTE.background)).toBeGreaterThanOrEqual(3);
  });
});

describe("ingest falls back to the repo for colours", () => {
  it("uses the repo palette when the live site is down (haypile.app 503)", async () => {
    const gh = fakeGitHub({ "public/manifest.json": HAYPILE_MANIFEST, "src/styles.css": HAYPILE_CSS }, HAYPILE_TREE);
    site.fetchSite.mockRejectedValue(new IngestError("Live page returned 503", "site_http_error"));
    const result = await ingest("https://github.com/luciengeorge/haypile");
    expect(result.site).toBeUndefined();
    expect(result.palette).toMatchObject({ source: "repo", background: "#f2eee5", accent: "#2e7d6e" });
    expect(gh.paletteCalls()).toEqual(["/repos/luciengeorge/haypile/git/trees/HEAD?recursive=1", "/repos/luciengeorge/haypile/contents/public/manifest.json", "/repos/luciengeorge/haypile/contents/src/styles.css"]);
  });

  it("uses the repo palette when the site loads but its palette is the default", async () => {
    fakeGitHub({ "public/manifest.json": HAYPILE_MANIFEST, "src/styles.css": HAYPILE_CSS }, HAYPILE_TREE);
    site.fetchSite.mockResolvedValue(siteWithoutColours());
    const result = await ingest("https://github.com/luciengeorge/haypile");
    expect(result.site).toBeDefined();
    expect(result.palette).toMatchObject({ source: "repo", background: "#f2eee5", accent: "#2e7d6e" });
  });

  it("keeps the site palette and makes no extra GitHub calls when the site has colours", async () => {
    const gh = fakeGitHub({ "src/styles.css": HAYPILE_CSS }, HAYPILE_TREE);
    site.fetchSite.mockResolvedValue({ ...siteWithoutColours(), css: ":root { --primary: #e4572e; --background: #ffffff; }" });
    const result = await ingest("https://github.com/luciengeorge/haypile");
    expect(result.palette).toMatchObject({ source: "site", accent: "#e4572e" });
    expect(gh.paletteCalls()).toEqual([]);
  });

  it("gives the neutral default when the repo has no colour files", async () => {
    const gh = fakeGitHub({}, ["README.md", "src/main.ts"]);
    site.fetchSite.mockResolvedValue(siteWithoutColours());
    const result = await ingest("https://github.com/luciengeorge/haypile");
    expect(result.palette).toEqual(DEFAULT_PALETTE);
    expect(gh.paletteCalls()).toEqual(["/repos/luciengeorge/haypile/git/trees/HEAD?recursive=1"]);
  });

  it("fails soft to the default when the tree call errors", async () => {
    fakeGitHub({ "src/styles.css": HAYPILE_CSS }, HAYPILE_TREE);
    const real = globalThis.fetch;
    vi.stubGlobal("fetch", (input: string, init?: RequestInit) => (input.includes("/git/trees/") ? Promise.reject(new TypeError("fetch failed")) : real(input, init)));
    site.fetchSite.mockRejectedValue(new IngestError("Live page returned 503", "site_http_error"));
    expect((await ingest("https://github.com/luciengeorge/haypile")).palette).toEqual(DEFAULT_PALETTE);
  });

  it("gives up within the time budget when GitHub hangs", async () => {
    fakeGitHub({ "src/styles.css": HAYPILE_CSS }, HAYPILE_TREE);
    const real = globalThis.fetch;
    vi.stubGlobal("fetch", (input: string, init?: RequestInit) =>
      input.includes("/git/trees/") ? new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason))) : real(input, init),
    );
    site.fetchSite.mockRejectedValue(new IngestError("Live page returned 503", "site_http_error"));
    const startedAt = Date.now();
    expect((await ingest("https://github.com/luciengeorge/haypile")).palette).toEqual(DEFAULT_PALETTE);
    expect(Date.now() - startedAt).toBeLessThan(REPO_PALETTE_BUDGET_MS + 1000);
  }, 10_000);
});
