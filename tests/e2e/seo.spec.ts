import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { PRODUCTS } from "../../src/lib/products";

test("home has title, description and Open Graph tags", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/LaunchLoop/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /launch/i);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /LaunchLoop/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /opengraph-image/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test("robots, sitemap and llms.txt", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap:");
  expect(robots).toContain("Disallow: /kit/");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/faq");
  expect(sitemap).toContain("/ship-loop");

  const llms = await request.get("/llms.txt");
  expect(llms.headers()["content-type"]).toContain("text/plain");
  const text = await llms.text();
  expect(text).toMatch(/^# LaunchLoop/);
  // The e2e build has the launch promo off, so the kit is at its list price.
  expect(text).toContain(`Launch Kit: ${PRODUCTS.kit.priceLabel} once`);
});

type JsonLdNode = { "@type": string; [key: string]: unknown };

async function jsonLdNodes(page: Page): Promise<JsonLdNode[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((raw) => {
    const data = JSON.parse(raw);
    expect(data["@context"]).toBe("https://schema.org");
    return data["@graph"] ?? [data];
  });
}

function findNode<T>(nodes: JsonLdNode[], type: string): T {
  const node = nodes.find((n) => n["@type"] === type);
  expect(node, type).toBeTruthy();
  return node as unknown as T;
}

async function sitemapPaths(request: APIRequestContext): Promise<{ paths: string[]; xml: string }> {
  const xml = await (await request.get("/sitemap.xml")).text();
  return { xml, paths: [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname) };
}

test("FAQ page ships FAQPage JSON-LD", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frequently asked questions");
  const faq = findNode<{ mainEntity: unknown[] }>(await jsonLdNodes(page), "FAQPage");
  expect(faq.mainEntity.length).toBeGreaterThan(5);
});

test("FAQ explains where the advice comes from, with sources, and the JSON-LD answer matches the page", async ({ page }) => {
  await page.goto("/faq");
  await page.getByRole("navigation", { name: "Questions" }).getByRole("link", { name: "Where does the advice come from?" }).click();
  await expect(page).toHaveURL(/#where-does-the-advice-come-from$/);
  const section = page.locator("#where-does-the-advice-come-from");
  await expect(section.getByRole("heading", { level: 2 })).toHaveText("Where does the advice come from?");
  for (const href of [
    "https://help.producthunt.com/en/articles/17350772-launch-guide",
    "https://help.producthunt.com/en/articles/479557-how-to-post-a-product",
    "https://news.ycombinator.com/newsguidelines.html",
    "https://news.ycombinator.com/showhn.html",
    "https://docs.x.com/fundamentals/counting-characters",
    "https://www.linkedin.com/help/linkedin/answer/a528176",
    "/how-to-write-a-product-hunt-tagline",
    "/show-hn-launch-checklist",
    "/how-to-promote-on-reddit",
  ]) {
    await expect(section.locator(`a[href="${href}"]`).first(), href).toBeVisible();
  }
  const text = (await section.textContent()) ?? "";
  expect(text).toContain("drafted by AI");
  expect(text).not.toMatch(/[\u2013\u2014]/);

  const answer = (await section.locator("h2 + p").textContent())?.trim();
  const faq = findNode<{ mainEntity: { name: string; acceptedAnswer: { text: string } }[] }>(await jsonLdNodes(page), "FAQPage");
  expect(faq.mainEntity.find((q) => q.name === "Where does the advice come from?")?.acceptedAnswer.text).toBe(answer);
});

test("sitemap lists every indexable page once, with lastmod, and no redirecting URLs", async ({ request }) => {
  const { xml, paths } = await sitemapPaths(request);
  const expected = [
    "/",
    "/pricing",
    "/ship-loop",
    "/faq",
    "/guides",
    "/tools",
    "/tools/product-hunt-tagline-checker",
    "/tools/og-preview",
    "/product-hunt-launch-checklist",
    "/how-to-launch-a-vibe-coded-app",
    "/how-to-promote-on-reddit",
    "/how-to-write-a-show-hn-post",
    "/blog",
    "/blog/how-to-launch-on-product-hunt",
    "/blog/how-to-launch-on-indie-hackers",
    "/privacy",
    "/terms",
  ];
  expect(paths).toEqual(expect.arrayContaining(expected));
  expect(new Set(paths).size).toBe(paths.length);
  expect(xml.match(/<lastmod>\d{4}-\d{2}-\d{2}/g)?.length).toBe(paths.length);
  for (const path of ["/product-hunt-tagline-checker", "/og-preview", "/blog/rss.xml", "/login", "/account"]) expect(paths).not.toContain(path);
  for (const path of paths) expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(200);
});

test("every sitemap page has unique, well-sized metadata with a self canonical and matching social tags", async ({ page, request }) => {
  const { paths } = await sitemapPaths(request);
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const path of paths) {
    await page.goto(path);
    const title = await page.title();
    const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    expect(title.length, `${path} title "${title}"`).toBeGreaterThanOrEqual(50);
    expect(title.length, `${path} title "${title}"`).toBeLessThanOrEqual(59);
    expect(description.length, `${path} description`).toBeGreaterThanOrEqual(138);
    expect(description.length, `${path} description`).toBeLessThanOrEqual(158);
    titles.add(title);
    descriptions.add(description);

    const self = path === "/" ? /^http:\/\/127\.0\.0\.1:\d+\/?$/ : new RegExp(`^http://127\\.0\\.0\\.1:\\d+${path}$`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", self);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", self);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", description);
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", title);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const image = new URL((await page.locator('meta[property="og:image"]').first().getAttribute("content")) ?? "");
    const res = await request.get(image.pathname);
    expect(res.status(), `${path} og:image`).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  }
  expect(titles.size).toBe(paths.length);
  expect(descriptions.size).toBe(paths.length);
});

test("trailing slashes and the old tool aliases redirect permanently", async ({ request }) => {
  const redirects: [string, string][] = [
    ["/pricing/", "/pricing"],
    ["/faq/?ref=x", "/faq?ref=x"],
    ["/tools/og-preview/", "/tools/og-preview"],
    ["/blog/", "/blog"],
    ["/blog/how-to-launch-on-product-hunt/", "/blog/how-to-launch-on-product-hunt"],
    ["/product-hunt-tagline-checker", "/tools/product-hunt-tagline-checker"],
    ["/og-preview", "/tools/og-preview"],
  ];
  for (const [from, to] of redirects) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(308);
    const location = new URL(res.headers()["location"], "http://x");
    expect(`${location.pathname}${location.search}`, from).toBe(to);
  }
});

test("404 page has a 404 status, one noindex tag and no canonical", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("guides and tools hubs link every guide and tool", async ({ page, request }) => {
  const { paths } = await sitemapPaths(request);
  await page.goto("/guides");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Launch guides");
  for (const path of ["/product-hunt-launch-checklist", "/how-to-launch-a-vibe-coded-app"]) await expect(page.locator(`main a[href="${path}"]`).first()).toBeVisible();
  expect((await jsonLdNodes(page)).map((n) => n["@type"])).toEqual(expect.arrayContaining(["CollectionPage", "BreadcrumbList"]));

  await page.goto("/tools");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Free launch tools");
  for (const path of paths.filter((p) => p.startsWith("/tools/"))) await expect(page.locator(`main a[href="${path}"]`).first()).toBeVisible();

  await page.goto("/product-hunt-launch-checklist");
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Guides" }).click();
  await expect(page).toHaveURL(/\/guides$/);
});

test("pricing ships product JSON-LD with GBP offers; Ship Loop has none (waitlist only); both have breadcrumbs", async ({ page }) => {
  for (const [path, name] of [
    ["/pricing", "LaunchLoop"],
    ["/ship-loop", "Ship Loop"],
  ]) {
    await page.goto(path);
    const nodes = await jsonLdNodes(page);
    const app = findNode<{ name: string; offers?: { name: string; price: string; priceCurrency: string; availability: string }[] }>(nodes, "SoftwareApplication");
    expect(app.name).toBe(name);
    if (name === "Ship Loop") {
      expect(app.offers).toBeUndefined();
    } else {
      expect(app.offers!.map((o) => o.name)).toEqual(["Free preview", "Launch Kit (one-off)"]);
      for (const offer of app.offers!) expect(offer).toMatchObject({ priceCurrency: "GBP", price: expect.stringMatching(/^\d+(\.\d{2})?$/) });
    }
    expect(JSON.stringify(nodes)).not.toMatch(/PreOrder|Ship Loop (monthly|yearly)/);
    expect(nodes.map((n) => n["@type"])).toContain("BreadcrumbList");
  }
});

test("site OG image renders", async ({ request }) => {
  const res = await request.get("/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});

test("brand icons, manifest and llms-full.txt", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  const types = graph["@graph"].map((n: { "@type": string }) => n["@type"]);
  expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite", "SoftwareApplication"]));

  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.icons.length).toBeGreaterThan(2);
  expect((await request.get("/favicon.ico")).status()).toBe(200);
  expect((await request.get("/icons/icon-512.png")).status()).toBe(200);
  const full = await (await request.get("/llms-full.txt")).text();
  expect(full).toContain("## FAQ");
});

test("guides have unique metadata and are in the sitemap", async ({ page, request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/product-hunt-launch-checklist", "/how-to-launch-a-vibe-coded-app"]) {
    expect(sitemap).toContain(path);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new RegExp(`${path}$`));
  }
});

test("BIMI logo is a public SVG Tiny PS file", async ({ request }) => {
  const res = await request.get("/bimi/logo.svg");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/svg+xml");
  const svg = await res.text();
  expect(svg).toContain('baseProfile="tiny-ps"');
  expect(svg).toContain('version="1.2"');
  expect(svg).toContain("<title>LaunchLoop</title>");
  expect(svg).toMatch(/viewBox="0 0 (\d+) \1"/);
  expect(svg).not.toMatch(/<script|xlink:href|href=|<animate|<set\b|<image/);
  expect(svg).not.toMatch(/<svg[^>]*\s(x|y)=/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).not.toMatch(/Disallow: \/bimi/);
});
