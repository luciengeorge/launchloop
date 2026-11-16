import { readFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { parseDirectories, submitUrl } from "../../src/lib/directory-csv";
import { PRODUCTS } from "../../src/lib/products";
import { uniqueEmail } from "./helpers";

const ROWS = parseDirectories(readFileSync("data/directory-pack/directories.csv", "utf8"));
const FREE = ROWS.slice(0, 20);
const NOTES = ROWS.map((r) => r.notes).filter(Boolean);
/** Paid-only text: every row's notes, and a link to any directory past the free top 20 (the footer's own badges link elsewhere on those sites). */
const PAID_ONLY = [...NOTES, ...ROWS.slice(20).map((r) => `href="${r.url}"`)];
const PUBLIC_PAGES = ["/free-startup-directories", "/directory-pack"];

async function staticChunks(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith(".js")).map((e) => path.join(e.parentPath, e.name));
}

/** A paid pack through the mock checkout, as the Stripe return would leave it. */
async function buyPack(request: import("@playwright/test").APIRequestContext) {
  const packId = `e2ePack${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.padEnd(22, "x").slice(0, 22);
  const res = await request.post("/api/checkout/mock", { data: { product: "directoryPack", packId, email: uniqueEmail("pack") } });
  expect(res.status()).toBe(200);
  const { url } = (await res.json()) as { url: string };
  expect(url).toContain(`/directory-pack/access/${packId}`);
  return { packId, url };
}

test("free page: the brief's title, meta and H1, the top 20 from the CSV in rank order, and FAQPage JSON-LD matching the FAQ", async ({ page }) => {
  await page.goto("/free-startup-directories");
  await expect(page).toHaveTitle("Free startup directories to launch on, 2026 · LaunchLoop");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "A free top-20 of startup directories you can submit to in 2026, with queues, badge rules and the date we last checked. No invented traffic figures.",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Free startup directories: 20 places to launch a startup in 2026");

  const table = page.getByRole("table");
  await expect(table.locator("thead th")).toHaveText(["Directory", "Type", "Free route", "Queue or wait", "Badge or link back", "Link type", "Submit", "Last verified", "Our submission"]);
  const rows = table.locator("tbody tr");
  await expect(rows).toHaveCount(20);
  for (const [i, row] of FREE.entries()) {
    const link = rows.nth(i).getByRole("link", { name: row.name, exact: true });
    await expect(link).toHaveAttribute("href", row.url);
    await expect(rows.nth(i).getByRole("link", { name: "Submit" })).toHaveAttribute("href", submitUrl(row));
  }
  await expect(page.getByText(/^Last reviewed: /)).toBeVisible();

  type Node = { "@type"?: string; "@id"?: string; "@graph"?: Node[]; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] };
  const nodes = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((n) => JSON.parse(n.textContent ?? "{}") as Node));
  const faq = nodes.flatMap((n) => n["@graph"] ?? [n]).filter((n) => n["@type"] === "FAQPage");
  expect(faq).toHaveLength(1);
  expect(faq[0]["@id"]).toMatch(/\/free-startup-directories#faq$/);
  const questions = faq[0].mainEntity!;
  expect(questions.map((q) => q.name)).toEqual(await page.locator("#faq h3").allTextContents());
  // The brief's JSON-LD drops the visible answers' link sentences and quote marks; otherwise they're the same words.
  const plain = (text: string) => text.replace(/["\u201c\u201d]/g, "");
  for (const [i, q] of questions.entries()) expect(plain((await page.locator("#faq h3 + p").nth(i).textContent()) ?? "")).toContain(plain(q.acceptedAnswer.text));
  expect(JSON.stringify(nodes)).not.toContain(PRODUCTS.directoryPack.priceLabel);
  await expect(page.locator("main").getByRole("link", { name: "Product Hunt alternatives" }).first()).toHaveAttribute("href", "/blog/product-hunt-alternatives");
});

test("price not set: both pages say Coming soon with the pack waitlist, show no price and no Buy button, and checkout refuses", async ({ page, request }) => {
  for (const path of PUBLIC_PAGES) {
    await page.goto(path);
    const offer = page.getByTestId("pack-offer");
    await expect(offer).toContainText("Coming soon");
    await expect(offer.getByTestId("waitlist-form")).toBeVisible();
    await expect(page.getByRole("button", { name: /buy/i })).toHaveCount(0);
    expect(await page.content()).not.toContain(PRODUCTS.directoryPack.priceLabel);
  }
  const res = await request.post("/api/checkout", { data: { product: "directoryPack" } });
  expect(res.status()).toBe(503);
  expect(await res.json()).toMatchObject({ code: "not_on_sale" });
});

test("pack waitlist signup is tagged for the pack", async ({ page }) => {
  await page.goto("/directory-pack");
  const offer = page.getByTestId("pack-offer");
  const email = uniqueEmail("packwait");
  const request = page.waitForRequest((req) => req.method() === "POST" && new URL(req.url()).pathname === "/api/waitlist");
  await offer.getByRole("textbox", { name: "Email" }).fill(email);
  await offer.getByRole("button", { name: "Join the waitlist" }).click();
  expect((await request).postDataJSON()).toEqual({ email, source: "directory_pack_page" });
  await expect(offer.getByTestId("waitlist-status")).toHaveText("You're on the waitlist. We'll email you when the Directory Launch Pack launches.");
});

test("paid data never reaches unpaid visitors: not in the public pages' HTML, not in any client chunk, and the APIs answer 403", async ({ page, request }) => {
  for (const path of PUBLIC_PAGES) {
    const html = await (await request.get(path)).text();
    for (const text of PAID_ONLY) expect(html.includes(text), `${path} leaks ${text.slice(0, 40)}`).toBe(false);
  }
  const chunks = await staticChunks(path.join(".next-test", "static"));
  expect(chunks.length).toBeGreaterThan(10);
  for (const file of chunks) {
    const js = await readFile(file, "utf8");
    for (const text of NOTES) expect(js.includes(text), `${file} leaks ${text.slice(0, 40)}`).toBe(false);
  }
  const stranger = "packNobodyPaid01234567";
  expect((await request.get(`/api/directory-pack/${stranger}/csv`)).status()).toBe(403);
  expect((await request.post(`/api/directory-pack/${stranger}/listings`, { data: { name: "x" } })).status()).toBe(403);
  await page.goto(`/directory-pack/access/${stranger}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't find a paid pack at this link");
  for (const text of PAID_ONLY) expect((await page.content()).includes(text)).toBe(false);

  // The check above means something: the same text is on the page once the pack is paid.
  const { url } = await buyPack(request);
  const paid = await (await request.get(url)).text();
  expect(paid).toContain(ROWS[0].notes.slice(0, 40));
});

test("after payment: every row and column, the CSV download, and listing copy per directory within its limits", async ({ page, request }) => {
  const { packId, url } = await buyPack(request);
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your Directory Launch Pack");
  const cards = page.getByTestId("directory-row");
  await expect(cards).toHaveCount(ROWS.length);
  const first = cards.first();
  for (const value of [ROWS[0].name, ROWS[0].category, ROWS[0].pricing, String(ROWS[0].dr), ROWS[0].approval_time, ROWS[0].utm_source]) await expect(first).toContainText(value);
  for (const [i, row] of ROWS.entries()) await expect(cards.nth(i).getByRole("link", { name: `Submit to ${row.name}` })).toHaveAttribute("href", submitUrl(row));

  const csv = await request.get(`/api/directory-pack/${packId}/csv`);
  expect(csv.status()).toBe(200);
  expect(parseDirectories(await csv.text())).toEqual(ROWS);

  const form = page.getByTestId("listing-form");
  await form.getByLabel("Product name").fill("Snapshelf");
  await form.getByLabel("Product URL").fill("https://snapshelf.app/");
  await form.getByLabel("What it does, in one sentence").fill("Snapshelf finds any screenshot on your Mac by the words in it");
  await form.getByLabel("Who it's for").fill("designers and developers");
  await form.getByRole("button", { name: "Write my listings" }).click();
  await expect(first.getByTestId("listing-tagline")).not.toBeEmpty();
  for (const [i, row] of ROWS.entries()) {
    const card = cards.nth(i);
    const tagline = (await card.getByTestId("listing-tagline").textContent()) ?? "";
    const description = (await card.getByTestId("listing-description").textContent()) ?? "";
    expect([...tagline].length, row.name).toBeLessThanOrEqual(row.tagline_max ?? 60);
    expect([...description].length, row.name).toBeLessThanOrEqual(row.description_max ?? 260);
    await expect(card.getByTestId("listing-link")).toHaveText(`https://snapshelf.app/?utm_source=${row.utm_source}&utm_medium=directory`);
  }
});
