import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

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
