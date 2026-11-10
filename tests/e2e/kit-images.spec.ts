import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { ELLIPSIS, textWidth } from "@/lib/image-fit";
import { planKitImage, type Box, type KitImageContent, type KitImagePlan, type TextBlock } from "@/lib/image-layout";
import type { Kit } from "@/lib/schema";

const FIXTURE = "http://127.0.0.1:3419";
const SIZES = { og: [1200, 630], x: [1600, 900], ph: [1270, 760] } as const;

const pngSize = (bytes: Buffer) => [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
const kitRecord = (id: string) =>
  (JSON.parse(readFileSync(path.join(process.cwd(), ".data-test", `dev_kit_${id}.json`), "utf8")) as { value: { visuals?: unknown } }).value;

test("a preview from a site with a share image and an icon keeps them and draws all three images with them", async ({ request }) => {
  const res = await request.post("/api/kits", { data: { url: `${FIXTURE}/visual` }, headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 20}` } });
  expect(res.status()).toBe(201);
  const { id } = (await res.json()) as { id: string };

  expect(kitRecord(id).visuals).toEqual({
    screenshot: { url: `${FIXTURE}/og/img-1600x1000.png`, width: 1600, height: 1000, format: "png", source: "site" },
    logo: { url: `${FIXTURE}/og/img-180x180.png`, width: 180, height: 180, format: "png", source: "site" },
  });

  for (const [variant, size] of Object.entries(SIZES)) {
    const image = await request.get(`/api/og/${id}/${variant}`);
    expect(image.status(), variant).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");
    // Both images loaded, so the watermarked preview is cacheable as usual.
    expect(image.headers()["cache-control"]).toBe("public, max-age=300, s-maxage=300");
    expect(pngSize(await image.body()), variant).toEqual(size);
  }
});

test("WebP and GIF images are never kept, and an image a CDN would send as WebP is asked for as PNG", async ({ request }) => {
  const res = await request.post("/api/kits", { data: { url: `${FIXTURE}/visual-webp` }, headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 20}` } });
  expect(res.status()).toBe(201);
  const { id } = (await res.json()) as { id: string };

  // No screenshot, so the images use the type-led layout; the logo is the negotiated icon, served as PNG.
  expect(kitRecord(id).visuals).toEqual({ logo: { url: `${FIXTURE}/og/negotiated-152x152.png`, width: 152, height: 152, format: "png", source: "site" } });

  for (const [variant, size] of Object.entries(SIZES)) {
    const image = await request.get(`/api/og/${id}/${variant}`);
    expect(image.status(), variant).toBe(200);
    expect(image.headers()["cache-control"], "the logo loaded again at render time").toBe("public, max-age=300, s-maxage=300");
    expect(pngSize(await image.body()), variant).toEqual(size);
  }
});

/** Equivalent to sonner's (emilkowalski/sonner, 8e4662b3) feature line that ellipsized in the Product Hunt image on 27 Oct. */
const LONG_FEATURE = "Works out of the box with Next.js App Router, Server Components, Remix, Vite and Astro, with no providers or extra setup";
const SONNER: KitImageContent = {
  name: "Sonner",
  tagline: "An opinionated toast component for React",
  headline: "Toasts that look good by default",
  features: [LONG_FEATURE, "Swipe to dismiss", "Promise toasts"],
  domain: "github.com/emilkowalski/sonner",
};

/** Stores a kit the way the e2e server's file store keeps it. kitImageContent maps these plain strings to SONNER unchanged. */
function seedSonnerKit({ paid, screenshot }: { paid: boolean; screenshot: boolean }): string {
  const id = `sonnerfit${paid ? "paid" : "free"}${screenshot ? "shot" : "type"}${Math.random().toString(36).slice(2, 8)}`;
  const kit: Kit = {
    id,
    createdAt: new Date().toISOString(),
    status: paid ? "ready" : "preview",
    source: { input: "https://github.com/emilkowalski/sonner", repoUrl: "https://github.com/emilkowalski/sonner", commitsAnalysed: 20, readmeFound: true, packageJsonFound: true, pageScraped: false, warnings: [] },
    brief: { name: SONNER.name, oneLiner: SONNER.headline, audience: "React developers", problem: "Toasts take setup", features: SONNER.features, proofPoints: [], stack: ["React"], tone: "plain", repoUrl: "https://github.com/emilkowalski/sonner" },
    palette: { background: "#ffffff", foreground: "#0a0a10", accent: "#e4572e", accentForeground: "#ffffff", muted: "#626161", source: "repo" },
    visuals: screenshot ? { screenshot: { url: `${FIXTURE}/og/img-1600x1000.png`, width: 1600, height: 1000, format: "png", source: "site" } } : {},
    preview: { tagline: SONNER.tagline, xPost: "I built Sonner." },
    digest: "",
    llm: "mock",
    paid,
    attempts: 0,
  };
  writeFileSync(path.join(process.cwd(), ".data-test", `dev_kit_${id}.json`), JSON.stringify({ value: kit }));
  return id;
}

/** Each drawn feature's text, laid out at its fitted size, and the box it has to stay in. */
function featureLayouts(plan: KitImagePlan): { label: string; block: TextBlock; box: Box }[] {
  switch (plan.variant) {
    case "og":
      return [];
    case "x":
      return plan.pills.map((pill, i) => {
        const inset = pill.border + pill.padX;
        const top = pill.border + pill.padY;
        const left = inset + pill.dot + pill.gap;
        const box = { x: pill.box.x + left, y: pill.box.y + top, width: pill.box.width - left - inset, height: pill.box.height - 2 * top };
        return { label: `pill ${i}`, block: { text: pill.text, box: { ...box, y: box.y + (box.height - pill.text.height) / 2 } }, box };
      });
    case "ph": {
      const column = { x: plan.padding, y: plan.padding, width: (plan.shot?.frame.x ?? plan.width - plan.padding) - plan.padding, height: plan.height - 2 * plan.padding };
      return [
        ...plan.features.map((item, i) => ({ label: `feature ${i}`, block: item.text, box: column })),
        ...plan.cards.map((card, i) => ({ label: `card ${i}`, block: card.text, box: card.box })),
      ];
    }
    default: {
      const unreachable: never = plan;
      throw new Error(`Unknown image plan: ${String(unreachable)}`);
    }
  }
}

const textBounds = ({ text, box }: TextBlock): Box => ({
  x: box.x,
  y: box.y,
  width: Math.max(0, ...text.lines.map((line) => textWidth(line, text.fontSize, text.letterSpacing, text.weight))),
  height: text.lines.length * text.fontSize * text.lineHeight,
});
const contains = (outer: Box, inner: Box) =>
  inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.x + inner.width <= outer.x + outer.width + 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;

test("a long feature line is drawn whole, with no ellipsis, inside its feature box at 1200x630, 1600x900 and 1270x760", async ({ request }) => {
  const problems: string[] = [];
  for (const paid of [false, true]) {
    for (const screenshot of [false, true]) {
      const id = seedSonnerKit({ paid, screenshot });
      for (const [variant, size] of Object.entries(SIZES) as [keyof typeof SIZES, readonly [number, number]][]) {
        const where = `${variant} ${screenshot ? "shot" : "type"} ${paid ? "paid" : "watermarked"}`;
        const image = await request.get(`/api/og/${id}/${variant}`);
        expect(image.status(), where).toBe(200);
        expect(image.headers()["cache-control"], `${where}: the screenshot loaded`).not.toBe("no-store");
        expect(pngSize(await image.body()), where).toEqual(size);

        const plan = planKitImage(variant, SONNER, { screenshot: screenshot ? { width: 1600, height: 1000 } : undefined, watermark: !paid });
        const features = featureLayouts(plan);
        if (variant !== "og" && !features.some(({ block }) => block.text.lines.join(" ") === LONG_FEATURE)) problems.push(`${where}: the long feature isn't drawn whole`);
        for (const { label, block, box } of features) {
          if (block.text.lines.some((line) => line.includes(ELLIPSIS))) problems.push(`${where} ${label}: ${JSON.stringify(block.text.lines)}`);
          if (!contains(box, textBounds(block))) problems.push(`${where} ${label}: text ${JSON.stringify(textBounds(block))} leaves ${JSON.stringify(box)}`);
        }
      }
    }
  }
  expect(problems).toEqual([]);
});

test("a sample kit with no screenshot or logo still draws every size", async ({ request }) => {
  const { id } = (await (await request.post("/api/kits", { data: { url: "sample" } })).json()) as { id: string };
  expect(kitRecord(id).visuals).toEqual({});
  for (const [variant, size] of Object.entries(SIZES)) {
    const image = await request.get(`/api/og/${id}/${variant}?v=paid`);
    expect(image.status(), variant).toBe(200);
    expect(image.headers()["cache-control"], "an unpaid kit's paid URL is never cached").toBe("no-store");
    expect(pngSize(await image.body()), variant).toEqual(size);
  }
});
