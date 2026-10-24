/**
 * Renders the kit images for real repos, for design review:
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/render-kit-images.tsx build <kitsDir> <owner/repo>...
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/render-kit-images.tsx render <kitsDir> <outDir> <label>
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/render-kit-images.tsx sheet <outDir> <slug>...
 * `build` ingests each repo (live network) and writes the kit JSON a free preview would have, with the
 * mock LLM's copy. `render` draws every kit in <kitsDir> as <slug>-<og|x|ph>-<label>.png with whatever
 * src/lib/images.tsx is checked out, so two checkouts can render the same kits for a before/after.
 * `sheet` lays out <slug>-*-before.png and -after.png side by side as <slug>-contact-sheet.png.
 *
 * Outside a Next build, @vercel/og 1.0.3 looks for an hb.wasm it doesn't ship and every render hangs.
 * Copy harfbuzzjs@0.10.0's hb.wasm to node_modules/@vercel/og/dist/ first:
 *   npm pack harfbuzzjs@0.10.0 && tar xzf harfbuzzjs-0.10.0.tgz package/hb.wasm && mv package/hb.wasm node_modules/@vercel/og/dist/
 */
/* eslint-disable @next/next/no-img-element -- Satori draws plain <img>; next/image does not exist there. */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "@vercel/og";
import { buildBrief } from "../src/lib/brief";
import { generatePreview } from "../src/lib/copy";
import { ingest } from "../src/lib/ingest";
import { renderKitImageBuffer } from "../src/lib/images";
import type { Kit } from "../src/lib/schema";

const VARIANTS = [
  { key: "og", width: 1200, height: 630 },
  { key: "x", width: 1600, height: 900 },
  { key: "ph", width: 1270, height: 760 },
] as const;

const slugOf = (repo: string) => repo.split("/")[1].toLowerCase().replace(/[^a-z0-9]+/g, "-");

async function build(kitsDir: string, repos: string[]) {
  process.env.LLM_PROVIDER = "mock";
  await mkdir(kitsDir, { recursive: true });
  for (const repo of repos) {
    const source = await ingest(`https://github.com/${repo}`);
    const { brief, provider } = await buildBrief(source);
    const { preview } = await generatePreview(brief);
    const kit: Kit = {
      id: `local-${slugOf(repo)}`,
      createdAt: new Date().toISOString(),
      status: "preview",
      source: source.source,
      brief,
      palette: source.palette,
      visuals: source.visuals,
      preview,
      digest: "",
      llm: provider,
      paid: false,
      attempts: 0,
    };
    await writeFile(path.join(kitsDir, `${slugOf(repo)}.json`), JSON.stringify(kit, null, 2));
    console.log(repo, JSON.stringify({ palette: kit.palette, visuals: kit.visuals, name: brief.name, tagline: preview.tagline }));
  }
}

async function render(kitsDir: string, outDir: string, label: string) {
  await mkdir(outDir, { recursive: true });
  for (const file of (await readdir(kitsDir)).filter((f) => f.endsWith(".json"))) {
    const kit = JSON.parse(await readFile(path.join(kitsDir, file), "utf8")) as Kit;
    const slug = file.replace(/\.json$/, "");
    for (const { key } of VARIANTS) {
      const png = await renderKitImageBuffer(kit, key);
      await writeFile(path.join(outDir, `${slug}-${key}-${label}.png`), png);
    }
    console.log(`rendered ${slug} (${label})`);
  }
}

async function sheet(outDir: string, slugs: string[]) {
  const colWidth = 900;
  for (const slug of slugs) {
    const cells = await Promise.all(
      VARIANTS.map(async (v) => ({
        ...v,
        before: `data:image/png;base64,${(await readFile(path.join(outDir, `${slug}-${v.key}-before.png`))).toString("base64")}`,
        after: `data:image/png;base64,${(await readFile(path.join(outDir, `${slug}-${v.key}-after.png`))).toString("base64")}`,
      })),
    );
    const rowHeights = cells.map((c) => Math.round((colWidth * c.height) / c.width));
    const height = 120 + rowHeights.reduce((a, b) => a + b + 70, 0);
    const width = 2 * colWidth + 3 * 40;
    const res = new ImageResponse(
      (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#0f0f12", color: "#f4f4f5", padding: 40, fontSize: 28 }}>
          <div style={{ display: "flex", gap: 40, height: 60, alignItems: "center", fontSize: 34 }}>
            <div style={{ display: "flex", width: colWidth }}>{`${slug}: before (main)`}</div>
            <div style={{ display: "flex", width: colWidth }}>after (this branch)</div>
          </div>
          {cells.map((c, i) => (
            <div key={c.key} style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
              <div style={{ display: "flex", height: 40, color: "#a1a1aa" }}>{`${c.key} ${c.width}×${c.height}`}</div>
              <div style={{ display: "flex", gap: 40 }}>
                <img src={c.before} width={colWidth} height={rowHeights[i]} alt="" />
                <img src={c.after} width={colWidth} height={rowHeights[i]} alt="" />
              </div>
            </div>
          ))}
        </div>
      ),
      { width, height },
    );
    await writeFile(path.join(outDir, `${slug}-contact-sheet.png`), new Uint8Array(await res.arrayBuffer()));
    console.log(`sheet ${slug}`);
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "build") return build(args[0], args.slice(1));
  if (command === "render") return render(args[0], args[1], args[2]);
  if (command === "sheet") return sheet(args[0], args.slice(1));
  throw new Error("usage: build <kitsDir> <owner/repo>... | render <kitsDir> <outDir> <label> | sheet <outDir> <slug>...");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
