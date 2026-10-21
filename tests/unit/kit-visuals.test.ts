import { parse } from "node-html-parser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bytesResponse, sizedGif, sizedPng, sizedWebp } from "./png";

const fetchMock = vi.hoisted(() => ({ safeFetch: vi.fn(), safeFetchBytes: vi.fn() }));
vi.mock("@/lib/ingest/safe-fetch", async (importOriginal) => ({ ...(await importOriginal<object>()), ...fetchMock }));

const { discoverVisuals, fits, kitImageFormat, readmeShots, repoImageFiles, treePaths } = await import("@/lib/ingest/visuals");
const { pageImages } = await import("@/lib/ingest/site");
const { imageSize, svgSize } = await import("@/lib/ingest/image-size");

const REPO = { owner: "acme", name: "rocket", url: "https://github.com/acme/rocket", topics: [], commits: [] };

describe("README images", () => {
  const readme = [
    "<p align='center'><img alt='Rocket logo' src='.github/logo.png' width='200'></p>",
    "[![CI](https://github.com/acme/rocket/actions/workflows/ci.yml/badge.svg)](https://github.com/acme/rocket/actions)",
    "![npm](https://img.shields.io/npm/v/rocket.svg)",
    "[![Watch the demo](https://img.youtube.com/vi/abc/0.jpg)](https://youtube.com/watch?v=abc)",
    "![Dashboard](docs/dashboard.png)",
    '<img src="https://github.com/acme/rocket/blob/main/assets/run view.png" alt="Run view">',
    "![](https://github.com/user-attachments/assets/0a1b2c3d)",
    '<img src="https://contrib.rocks/image?repo=acme/rocket" />',
  ].join("\n");

  it("keeps product shots in document order and drops badges, logos, charts and video thumbnails", () => {
    expect(readmeShots(readme, "acme", "rocket")).toEqual([
      "https://raw.githubusercontent.com/acme/rocket/HEAD/docs/dashboard.png",
      "https://raw.githubusercontent.com/acme/rocket/main/assets/run view.png",
      "https://github.com/user-attachments/assets/0a1b2c3d",
    ]);
  });

  it("matches a path with a stray % as written instead of throwing", () => {
    const readme = "![Usage](https://example.com/100%.png)\n![Run](https://example.com/logo%zz.png)\n![App](https://example.com/app%20view.png)";
    expect(readmeShots(readme, "acme", "rocket")).toEqual(["https://example.com/100%.png", "https://example.com/app%20view.png"]);
  });
});

describe("repo files", () => {
  it("finds screenshots, share images and logos, root and marketing apps first", () => {
    const files = repoImageFiles([
      "README.md",
      "packages/ui/public/logo.svg",
      "apps/web/public/logo.svg",
      "public/favicon.svg",
      "public/apple-touch-icon.png",
      "public/og-image.png",
      "docs/screenshots/editor.png",
      "src/components/hero.tsx",
      "tests/fixtures/screenshot.png",
      "node_modules/x/logo.png",
      ".agents/skills/foo/assets/icon.svg",
    ]);
    expect(files.shots).toEqual(["docs/screenshots/editor.png"]);
    expect(files.ogs).toEqual(["public/og-image.png"]);
    expect(files.logos).toEqual(["apps/web/public/logo.svg", "packages/ui/public/logo.svg", "public/apple-touch-icon.png", "public/favicon.svg"]);
  });

  it("reads paths from a tree listing even when it was cut off mid-way", () => {
    const listing = '{"sha":"x","tree":[{"path":"public","mode":"040000","type":"tree"},{"path":"public/og.png","mode":"100644","type":"blob","size":1},{"path":"docs/a \\"b\\".png","mode":"100644","type":"blob"},{"path":"src/ap';
    expect(treePaths(listing)).toEqual(["public/og.png", 'docs/a "b".png']);
  });
});

describe("page images", () => {
  it("ranks apple-touch-icons, then SVG icons, then big PNG icons, and skips .ico", () => {
    const root = parse(`<head>
      <meta property="og:image" content="/og.png">
      <link rel="icon" href="/favicon.ico">
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
      <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
      <link rel="icon" type="image/svg+xml" href="/icon.svg">
      <link rel="apple-touch-icon" sizes="180x180" href="https://cdn.example.com/apple.png">
      <link rel="apple-touch-icon" sizes="72x72" href="/apple-72.png">
    </head>`);
    expect(pageImages(root, "https://example.com/app/")).toEqual({
      ogImage: "https://example.com/og.png",
      icons: ["https://cdn.example.com/apple.png", "https://example.com/apple-72.png", "https://example.com/icon.svg", "https://example.com/icon-192.png"],
    });
  });
});

describe("shape rules", () => {
  it("wants a landscape raster screenshot and a square-ish logo", () => {
    expect(fits("screenshot", "png", 1600, 1000)).toBe(true);
    expect(fits("screenshot", "png", 1000, 1000)).toBe(false);
    expect(fits("screenshot", "png", 3000, 600)).toBe(false);
    expect(fits("screenshot", "png", 400, 250)).toBe(false);
    expect(fits("screenshot", "svg", 1600, 1000)).toBe(false);
    expect(fits("screenshot", "png", 8000, 5000)).toBe(false);
    expect(fits("logo", "png", 180, 180)).toBe(true);
    expect(fits("logo", "png", 32, 32)).toBe(false);
    expect(fits("logo", "svg", 24, 24)).toBe(true);
    expect(fits("logo", "svg", 400, 100)).toBe(false);
  });

  it("keeps only what Satori draws: PNG and JPEG, plus SVG for a logo, with any image content type agreeing", () => {
    expect(kitImageFormat("screenshot", "png", "image/png")).toBe("png");
    expect(kitImageFormat("screenshot", "jpeg", "image/jpeg; charset=binary")).toBe("jpeg");
    expect(kitImageFormat("screenshot", "png", "application/octet-stream")).toBe("png");
    expect(kitImageFormat("screenshot", "webp", "image/webp")).toBeNull();
    expect(kitImageFormat("logo", "gif", "image/gif")).toBeNull();
    expect(kitImageFormat("logo", "avif", "image/avif")).toBeNull();
    expect(kitImageFormat("screenshot", "png", "image/webp")).toBeNull();
    expect(kitImageFormat("logo", "svg", "image/svg+xml")).toBe("svg");
    expect(kitImageFormat("screenshot", "svg", "image/svg+xml")).toBeNull();
  });

  it("reads SVG sizes from width/height or the viewBox", () => {
    expect(svgSize('<svg xmlns="http://www.w3.org/2000/svg" width="64px" height="64">')).toEqual({ width: 64, height: 64 });
    expect(svgSize('<svg viewBox="0 0 120 40" width="100%">')).toEqual({ width: 120, height: 40 });
    expect(imageSize(new TextEncoder().encode('<?xml version="1.0"?><svg viewBox="0 0 32 32"></svg>'))).toEqual({ format: "svg", width: 32, height: 32 });
  });
});

describe("discoverVisuals", () => {
  beforeEach(() => {
    fetchMock.safeFetch.mockReset();
    fetchMock.safeFetchBytes.mockReset();
  });

  const site = { url: "https://rocket.dev/", headings: [], paragraphs: [], listItems: [], prices: [], css: "", ogImage: "https://rocket.dev/og.png", icons: ["https://rocket.dev/apple.png"] };

  it("prefers a README screenshot to the share image, and fetches everything through safe-fetch", async () => {
    fetchMock.safeFetch.mockResolvedValue({ url: "", status: 200, contentType: "application/json", text: '{"tree":[]}' });
    const sizes: Record<string, Uint8Array> = {
      "https://raw.githubusercontent.com/acme/rocket/HEAD/docs/app.png": sizedPng(2400, 1500),
      "https://rocket.dev/og.png": sizedPng(1200, 630),
      "https://rocket.dev/apple.png": sizedPng(180, 180),
    };
    fetchMock.safeFetchBytes.mockImplementation(async (url: string) => bytesResponse(sizes[url]));
    const visuals = await discoverVisuals({ ...REPO, readme: "![App](docs/app.png)" }, site);
    expect(visuals).toEqual({
      screenshot: { url: "https://raw.githubusercontent.com/acme/rocket/HEAD/docs/app.png", width: 2400, height: 1500, format: "png", source: "readme" },
      logo: { url: "https://rocket.dev/apple.png", width: 180, height: 180, format: "png", source: "site" },
    });
    expect(fetchMock.safeFetch).toHaveBeenCalledWith("https://api.github.com/repos/acme/rocket/git/trees/HEAD?recursive=1", expect.objectContaining({ maxBytes: expect.any(Number), timeoutMs: expect.any(Number) }));
    for (const [, options] of fetchMock.safeFetchBytes.mock.calls) expect(options).toMatchObject({ maxBytes: 128_000, timeoutMs: 4000 });
  });

  it("falls back down the ranking when candidates are the wrong shape, missing or too big", async () => {
    fetchMock.safeFetch.mockResolvedValue({ url: "", status: 200, contentType: "application/json", text: '{"tree":[{"path":"public/logo.svg","mode":"100644","type":"blob"}]}' });
    fetchMock.safeFetchBytes.mockImplementation(async (url: string) => {
      if (url.endsWith("square.png")) return bytesResponse(sizedPng(1000, 1000));
      if (url.endsWith("huge.png")) return { ...bytesResponse(sizedPng(2000, 1200)), contentLength: 9_000_000 };
      if (url.endsWith("gone.png")) return { ...bytesResponse(new Uint8Array()), status: 404 };
      if (url === "https://rocket.dev/og.png") return bytesResponse(sizedPng(1200, 630));
      if (url.endsWith("logo.svg")) return bytesResponse(new TextEncoder().encode('<svg viewBox="0 0 48 48"><path d="M0 0h48v48H0z"/></svg>'), "image/svg+xml");
      throw new Error(`unexpected ${url}`);
    });
    const visuals = await discoverVisuals({ ...REPO, readme: "![a](square.png) ![b](huge.png) ![c](gone.png)" }, { ...site, icons: [] });
    expect(visuals.screenshot).toMatchObject({ url: "https://rocket.dev/og.png", source: "site" });
    expect(visuals.logo).toMatchObject({ url: "https://raw.githubusercontent.com/acme/rocket/HEAD/public/logo.svg", format: "svg", source: "repo" });
  });

  it("rejects WebP and GIF candidates, falling back to the next PNG or to nothing, and never asks for them", async () => {
    fetchMock.safeFetch.mockResolvedValue({ url: "", status: 200, contentType: "application/json", text: '{"tree":[]}' });
    fetchMock.safeFetchBytes.mockImplementation(async (url: string) => {
      if (url.endsWith("app.png")) return bytesResponse(sizedWebp(2400, 1500), "image/webp");
      if (url.endsWith("demo.png")) return bytesResponse(sizedGif(1600, 1000), "image/gif");
      if (url === "https://rocket.dev/og.png") return bytesResponse(sizedPng(1200, 630));
      if (url.endsWith("apple.png")) return bytesResponse(sizedWebp(180, 180), "image/webp");
      throw new Error(`unexpected ${url}`);
    });
    const visuals = await discoverVisuals({ ...REPO, readme: "![App](docs/app.png) ![Demo](docs/demo.png)" }, site);
    expect(visuals).toEqual({ screenshot: expect.objectContaining({ url: "https://rocket.dev/og.png", format: "png" }) });
    for (const [, options] of fetchMock.safeFetchBytes.mock.calls) expect(options.accept).not.toMatch(/webp|gif|\*\/\*/);

    fetchMock.safeFetchBytes.mockImplementation(async () => bytesResponse(sizedWebp(1600, 1000), "image/webp"));
    expect(await discoverVisuals({ ...REPO, readme: "![App](docs/app.png)" }, site)).toEqual({});
  });

  it("a README image URL with a stray % doesn't fail the lookup", async () => {
    fetchMock.safeFetch.mockResolvedValue({ url: "", status: 200, contentType: "application/json", text: '{"tree":[]}' });
    fetchMock.safeFetchBytes.mockImplementation(async (url: string) => bytesResponse(url.includes("100%") ? sizedPng(1600, 1000) : sizedPng(180, 180)));
    const visuals = await discoverVisuals({ ...REPO, readme: "![Usage](https://example.com/100%.png)" }, { ...site, ogImage: undefined });
    expect(visuals.screenshot).toMatchObject({ url: "https://example.com/100%.png", source: "readme" });
  });

  it("never waits longer than its budget, keeping whatever already arrived", async () => {
    fetchMock.safeFetch.mockReturnValue(new Promise(() => {}));
    fetchMock.safeFetchBytes.mockImplementation((url: string) => (url.endsWith("apple.png") ? Promise.resolve(bytesResponse(sizedPng(180, 180))) : new Promise(() => {})));
    const started = Date.now();
    const visuals = await discoverVisuals({ ...REPO, readme: "![App](docs/app.png)" }, site, 150);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(visuals).toEqual({ logo: expect.objectContaining({ url: "https://rocket.dev/apple.png" }) });
  });

  it("uses an organisation's avatar, and finds nothing without a repo or site", async () => {
    fetchMock.safeFetch.mockResolvedValue({ url: "", status: 404, contentType: "", text: "" });
    fetchMock.safeFetchBytes.mockResolvedValue(bytesResponse(sizedPng(460, 460)));
    expect((await discoverVisuals({ ...REPO, orgAvatarUrl: "https://avatars.githubusercontent.com/u/1?v=4" }, undefined)).logo).toMatchObject({ source: "avatar" });
    expect(await discoverVisuals(undefined, undefined)).toEqual({});
  });
});
