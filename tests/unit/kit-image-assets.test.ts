import { beforeEach, describe, expect, it, vi } from "vitest";
import { bytesResponse, png, sizedGif, sizedPng, sizedWebp } from "./png";

const fetchMock = vi.hoisted(() => ({ safeFetchBytes: vi.fn() }));
vi.mock("@/lib/ingest/safe-fetch", async (importOriginal) => ({ ...(await importOriginal<object>()), ...fetchMock }));

const { pngTone, svgTone } = await import("@/lib/image-tone");
const { loadKitImageAssets } = await import("@/lib/image-assets");
const { planKitImage } = await import("@/lib/image-layout");

describe("loadKitImageAssets", () => {
  beforeEach(() => {
    fetchMock.safeFetchBytes.mockReset();
  });

  it("embeds images as data URIs, re-checking them, and reports what failed", async () => {
    const logo = png(64, 64, (x, y) => (x > 8 && x < 56 && y > 8 && y < 56 ? [255, 255, 255, 255] : [0, 0, 0, 0]));
    fetchMock.safeFetchBytes.mockImplementation(async (url: string) => {
      if (url.endsWith("logo.png")) return bytesResponse(logo);
      if (url.endsWith("shot.png")) return { ...bytesResponse(sizedPng(1600, 1000)), truncated: true };
      throw new Error("nope");
    });
    const assets = await loadKitImageAssets({
      screenshot: { url: "https://x.dev/shot.png", width: 1600, height: 1000, format: "png", source: "site" },
      logo: { url: "https://x.dev/logo.png", width: 64, height: 64, format: "png", source: "site" },
    });
    expect(assets.screenshot).toBeUndefined();
    expect(assets.degraded).toBe(true);
    expect(assets.logo?.src.startsWith("data:image/png;base64,")).toBe(true);
    expect(assets.logo?.tone).toEqual({ transparent: true, luminance: 1 });
    expect(fetchMock.safeFetchBytes.mock.calls.map(([, o]) => o.maxBytes)).toEqual([3_000_000, 400_000]);
    expect(await loadKitImageAssets(undefined)).toEqual({ degraded: false });
  });

  it("drops a WebP screenshot and a GIF logo, so the image falls back to the type-led layout and the monogram", async () => {
    fetchMock.safeFetchBytes.mockImplementation(async (url: string) =>
      url.endsWith("shot.png") ? bytesResponse(sizedWebp(1600, 1000), "image/webp") : bytesResponse(sizedGif(180, 180), "image/gif"),
    );
    const assets = await loadKitImageAssets({
      screenshot: { url: "https://cal.dev/shot.png", width: 1600, height: 1000, format: "png", source: "site" },
      logo: { url: "https://cal.dev/logo.png", width: 180, height: 180, format: "png", source: "site" },
    });
    expect(assets).toEqual({ degraded: true });
    for (const [, options] of fetchMock.safeFetchBytes.mock.calls) expect(options.accept).not.toMatch(/webp|gif|\*\/\*/);

    const content = { name: "Cadence", tagline: "Book meetings across every calendar", headline: "Scheduling without the back and forth", features: ["Syncs every calendar"], domain: "cal.dev" };
    for (const variant of ["og", "x", "ph"] as const) {
      const plan = planKitImage(variant, content, { screenshot: assets.screenshot, watermark: false });
      expect(plan.layout, variant).toBe("type");
      expect(plan.shot, variant).toBeNull();
    }
    expect(planKitImage("og", content, { screenshot: { width: 1600, height: 1000 }, watermark: false }).layout).toBe("shot");
  });
});

describe("logo tone", () => {
  it("decodes PNG pixels: transparency and how light the visible part is", () => {
    expect(pngTone(png(40, 40, () => [0, 0, 0, 255]))).toEqual({ transparent: false, luminance: 0 });
    const whiteMark = pngTone(png(40, 40, (x) => (x < 20 ? [255, 255, 255, 255] : [0, 0, 0, 0])));
    expect(whiteMark?.transparent).toBe(true);
    expect(whiteMark?.luminance).toBeCloseTo(1);
    expect(pngTone(new Uint8Array([1, 2, 3]))).toBeUndefined();
  });

  it("reads SVG fills, treating a full-size first rect as an opaque background", () => {
    expect(svgTone('<svg viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#2E7D6E"/><rect fill="#F2EEE5"/></svg>')).toMatchObject({ transparent: false });
    expect(svgTone('<svg viewBox="0 0 24 24"><path d="M0 0L24 24"/></svg>')).toEqual({ transparent: true, luminance: 0 });
    expect(svgTone('<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M0 0"/></svg>')?.luminance).toBeCloseTo(1);
  });
});
