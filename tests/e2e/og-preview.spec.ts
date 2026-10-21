import { expect, test } from "@playwright/test";

const PATH = "/tools/og-preview";
const FIXTURE = "http://127.0.0.1:3419";

test("OG preview has its own title, meta, canonical, share image and JSON-LD", async ({ page, request }) => {
  await page.goto(PATH);
  await expect(page).toHaveTitle("OG Image Preview & Checker (1200×630) · LaunchLoop");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("OG image preview");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Open Graph.*1200×630.*launch kit\.$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${PATH}$`));
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new RegExp(`${PATH}$`));
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", new RegExp(`${PATH}/opengraph-image`));
  await expect(page.locator('meta[name="twitter:image"]').first()).toHaveAttribute("content", new RegExp(`${PATH}/opengraph-image`));

  const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  const nodes = graph["@graph"] as { "@type": string; mainEntity?: unknown[] }[];
  expect(nodes.map((n) => n["@type"])).toEqual(expect.arrayContaining(["WebApplication", "FAQPage", "BreadcrumbList"]));
  expect(nodes.find((n) => n["@type"] === "FAQPage")?.mainEntity).toHaveLength(5);

  const image = await request.get(`${PATH}/opengraph-image`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(PATH);
  expect(await (await request.get("/llms.txt")).text()).toContain(PATH);

  await expect(page.locator(`main a[href="/#start"]`).first()).toBeVisible();
  await expect(page.locator(`main a[href="/pricing"]`).first()).toBeVisible();
  for (const href of ["/product-hunt-launch-checklist", "/how-to-launch-a-vibe-coded-app", "/tools/product-hunt-tagline-checker"]) {
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  }
  const body = (await page.locator("main").innerText()).toLowerCase();
  expect(body).not.toMatch(/\bupvot|\bvotes?\b/);
});

test("the size copy matches the sources, and the size FAQ is one sentence plus a link to the blog post, in the page and the JSON-LD", async ({ page }) => {
  await page.goto(PATH);
  const size = page.locator("h2#size + ul");
  await expect(size).not.toContainText("all design their large card around");
  await expect(size).toContainText("X's archived docs describe a 2:1 image and Slack publishes no size");

  const q = "What size should an Open Graph image be?";
  const answer = page.locator("section", { has: page.getByRole("heading", { level: 3, name: q }) }).locator("p");
  await expect(answer.locator('a[href="/blog/og-image-size"]')).toHaveText("See what each platform's docs say.");
  const visible = ((await answer.textContent()) ?? "").trim();
  expect(visible.replace(/ See what each platform's docs say\.$/, "").match(/[.!?](\s|$)/g)).toHaveLength(1);

  const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  const faq = (graph["@graph"] as { "@type": string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] }[]).find((n) => n["@type"] === "FAQPage")!;
  const text = faq.mainEntity.find((e) => e.name === q)!.acceptedAnswer.text;
  expect(text).toMatch(/<a href="http:\/\/127\.0\.0\.1:\d+\/blog\/og-image-size">See what each platform's docs say\.<\/a>$/);
  expect(text.replace(/<[^>]+>/g, "")).toBe(visible);

  await page.locator('a[href="/blog/og-image-size"]').first().click();
  await expect(page).toHaveURL(/\/blog\/og-image-size$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("OG image size for X, LinkedIn, Facebook and Slack");
});

test("the SVG and robots.txt pitfalls quote their sources, and the missing-image FAQ matches its JSON-LD", async ({ page }) => {
  await page.goto(PATH);
  const pitfalls = page.getByTestId("og-pitfalls");
  const svg = pitfalls.getByRole("listitem").filter({ hasText: "SVG or a tiny logo" });
  await expect(svg.locator("q", { hasText: "SVG is not supported." })).toBeVisible();
  await expect(svg.locator('a[href^="https://web.archive.org/web/20260112050218/"]')).toBeVisible();
  await expect(svg).toContainText("Some platforms don't accept SVG");
  await expect(svg).not.toContainText("aren't shown by Facebook, X or LinkedIn");

  const crawler = pitfalls.getByRole("listitem").filter({ hasText: "A login wall or a blocked crawler" });
  await expect(crawler.locator("q", { hasText: "Your website has a robots.txt file that is blocking Twitter from getting your Card metadata." })).toBeVisible();
  await expect(crawler.locator("q", { hasText: "We do not currently honor robots.txt files." })).toBeVisible();
  await expect(crawler.locator("q", { hasText: "The most common cause is that the image specified via the twitter:image tag is not publicly accessible on the web." })).toBeVisible();
  await expect(crawler.locator('a[href="https://api.slack.com/robots"]')).toBeVisible();
  await expect(crawler).not.toContainText("your website may be blocking us");
  await expect(crawler.locator('a[href^="https://web.archive.org/web/20260104011518/"]')).toBeVisible();
  await expect(crawler).not.toContainText("is blocked in robots.txt, the preview is blank");
  await expect(pitfalls).not.toContainText(/\u2013|\u2014/);

  const item = (title: string) => pitfalls.getByRole("listitem").filter({ hasText: title });
  const js = item("Tags added by JavaScript");
  await expect(js.locator("q", { hasText: "No code is executed, so tags added by a client-side script after load are never seen." })).toBeVisible();
  await expect(js).not.toContainText("Link previewers don't run JavaScript");
  const relative = item("A relative image URL");
  await expect(relative.locator("q", { hasText: "Relative URLs must start with /." })).toBeVisible();
  await expect(relative.locator('a[href="https://ogp.me/"]')).toBeVisible();
  await expect(relative).not.toContainText("fails in most crawlers");
  const edges = item("Text too close to the edges");
  await expect(edges.locator("q", { hasText: "to display the full image in Feed without any cropping." })).toBeVisible();
  await expect(edges).not.toContainText("500px");
  const cache = item("An old cached card");
  for (const quote of ["roughly every seven days", "for around 30 minutes", "can also be used to update the image for a piece of content", "You can use the Post Inspector as a tool to refresh the URL."]) {
    await expect(cache.locator("q", { hasText: quote }), quote).toBeVisible();
  }
  await expect(cache.locator('a[href="https://www.linkedin.com/help/linkedin/answer/a6233775"]')).toBeVisible();
  await expect(cache).not.toContainText("sometimes for days");
  for (const li of await pitfalls.getByRole("listitem").all()) await expect(li.locator("a").first()).toHaveAttribute("href", /^https:\/\//);

  const main = page.locator("main");
  await expect(main).not.toContainText("Facebook and LinkedIn can show the image");
  await expect(main).toContainText("with the size declared, Facebook can show the image on the very first share");
  await expect(main).not.toContainText(/500px|fail in more apps|little thumbnail/);

  const q = "Why isn't my link showing a preview image?";
  const visible = ((await page.locator("section", { has: page.getByRole("heading", { level: 3, name: q }) }).locator("p").textContent()) ?? "").trim();
  expect(visible).toContain("some platforms don't accept SVG");
  expect(visible).not.toMatch(/^Usually/);
  const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  const faq = (graph["@graph"] as { "@type": string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] }[]).find((n) => n["@type"] === "FAQPage")!;
  expect(faq.mainEntity.find((e) => e.name === q)!.acceptedAnswer.text).toBe(visible);
});

test("the intro's iMessage mention quotes Apple's TN3156, and the intro claims a generic card, not each app's exact one", async ({ page }) => {
  await page.goto(PATH);
  const intro = page.getByTestId("og-intro");
  await expect(intro).toContainText("preview a generic link card built from the Open Graph tags that X, LinkedIn, Slack and iMessage read");
  await expect(intro).not.toContainText("the card people get");
  const apple = page.getByTestId("og-imessage-source");
  await expect(apple.locator('a[href="https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages"]')).toHaveText("TN3156: Create rich previews for Messages");
  await expect(apple.locator("q", { hasText: "Use the og:image property to include an image in your link preview." })).toBeVisible();
  await expect(apple.locator("q", { hasText: "Use the og:title property to specify the title of your link preview." })).toBeVisible();
  await expect(intro).not.toContainText(/\u2013|\u2014/);
  await expect(apple).not.toContainText(/\u2013|\u2014/);
});

test("short alias redirects to the tools URL", async ({ request }) => {
  const res = await request.get("/og-preview", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers().location).toMatch(new RegExp(`${PATH}$`));
});

test("OG preview is reachable from the footer, home hero, header and both guides", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Free tools and guides" }).locator(`a[href="${PATH}"]`)).toBeVisible();
  await expect(page.locator("#start").getByRole("link", { name: "preview your link card" })).toBeVisible();
  if (!isMobile) await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "OG preview" })).toBeVisible();
  for (const path of ["/product-hunt-launch-checklist", "/how-to-launch-a-vibe-coded-app"]) {
    await page.goto(path);
    await expect(page.locator("article").locator(`a[href="${PATH}"]`).first()).toBeVisible();
  }
});

test("well-tagged page: card at 1200×630, every check passes, deep link to the free preview", async ({ page }) => {
  await page.goto(PATH);
  const url = `${FIXTURE}/og/good`;
  await page.getByLabel("Live page URL").fill(url);
  await page.getByRole("button", { name: "Preview card" }).click();

  await expect(page.getByTestId("og-verdict")).toHaveAttribute("data-verdict", "pass");
  await expect(page.getByTestId("og-card-title")).toHaveText("Pagebird: turn customer calls into product specs");
  await expect(page.getByTestId("og-card-description")).toContainText("ranked specs");
  await expect(page.getByTestId("og-image-size")).toHaveText("1200×630");
  const frame = (await page.getByTestId("og-card-image").boundingBox())!;
  expect(frame.width / frame.height).toBeCloseTo(1200 / 630, 1);
  await expect(page.getByTestId("og-card-image").locator("img")).toHaveJSProperty("naturalWidth", 1200);

  const caption = page.getByTestId("og-card-caption");
  await expect(caption).toHaveText("A generic large-card preview, framed at 1200×630. Each platform crops and renders link cards a little differently, and images that aren't 1.91:1 are cropped to fit this frame. See what each platform's docs say.");
  await expect(caption.locator('a[href="/blog/og-image-size"]')).toBeVisible();
  await expect(caption).not.toContainText(/iMessage|based on/);

  for (const id of ["title", "description", "image", "image-size", "image-tags", "twitter-card", "url"]) {
    await expect(page.locator(`[data-check="${id}"]`)).toHaveAttribute("data-status", "pass");
  }
  await expect(page.getByTestId("og-cta")).toContainText("Your link card is ready.");
  await expect(page.getByTestId("og-cta-start")).toHaveAttribute("href", `/?url=${encodeURIComponent(url)}#start`);
  await expect(page.getByTestId("og-cta").locator('a[href="/pricing"]')).toBeVisible();

  await page.getByTestId("og-cta-start").click();
  await page.waitForURL(/\/\?url=.*#start$/);
  await expect(page.getByLabel("GitHub repo or live site URL")).toHaveValue(url);
});

test("missing tags and a small, relative, square-ish image get clear fixes", async ({ page }) => {
  await page.goto(PATH);
  await page.getByLabel("Live page URL").fill(`${FIXTURE}/og/bad`);
  await page.getByRole("button", { name: "Preview card" }).click();

  await expect(page.getByTestId("og-verdict")).toHaveAttribute("data-verdict", "fail");
  await expect(page.locator('[data-check="title"]')).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="description"]')).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="image"]')).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="image"]')).toContainText("relative");
  await expect(page.locator('[data-check="image-size"]')).toHaveAttribute("data-status", "fail");
  await expect(page.locator('[data-check="image-size"]')).toContainText("400×400");
  await expect(page.locator('[data-check="twitter-card"]')).toContainText("summary_large_image");
  await expect(page.getByTestId("og-card-title")).toHaveText("Snapshelf");
  await expect(page.getByTestId("og-cta")).toContainText("Want a share image that passes every check?");
  await expect(page.getByTestId("og-tags")).toContainText("missing");
});

test("wrong aspect ratio, broken image and no tags at all", async ({ page }) => {
  await page.goto(PATH);
  const input = page.getByLabel("Live page URL");
  const go = page.getByRole("button", { name: "Preview card" });

  await input.fill(`${FIXTURE}/og/square`);
  await go.click();
  await expect(page.locator('[data-check="image-size"]')).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="image-size"]')).toContainText("too tall");

  await input.fill(`${FIXTURE}/og/broken-image`);
  await go.click();
  await expect(page.locator('[data-check="image"]')).toHaveAttribute("data-status", "fail");
  await expect(page.locator('[data-check="image"]')).toContainText("HTTP 404");
  await expect(page.getByTestId("og-card-image")).toHaveAttribute("data-has-image", "false");

  await input.fill(`${FIXTURE}/og/none`);
  await go.click();
  await expect(page.locator('[data-check="title"]')).toHaveAttribute("data-status", "fail");
  await expect(page.locator('[data-check="image"]')).toContainText("No og:image");
  await expect(page.locator('[data-check="image"]')).not.toContainText("clicks");
});

test("friendly errors for bad input and unreachable pages", async ({ page }) => {
  await page.goto(PATH);
  const input = page.getByLabel("Live page URL");
  const go = page.getByRole("button", { name: "Preview card" });
  for (const { value, code } of [
    { value: "not a url", code: "invalid_url" },
    { value: `${FIXTURE}/broken`, code: "site_http_error" },
    { value: `${FIXTURE}/data.json`, code: "site_not_html" },
  ]) {
    await input.fill(value);
    await go.click();
    await expect(page.getByTestId("og-error")).toHaveAttribute("data-code", code);
    await expect(page.getByTestId("og-error")).not.toContainText("GitHub repo");
  }
});

test("try-it button previews LaunchLoop itself and keeps the plain CTA", async ({ page }) => {
  await page.goto(PATH);
  await page.getByRole("button", { name: "Try it on LaunchLoop" }).click();
  await expect(page.getByTestId("og-image-size")).toHaveText("1200×630");
  await expect(page.locator('[data-check="image-size"]')).toHaveAttribute("data-status", "pass");
  await expect(page.getByTestId("og-cta-start")).toHaveAttribute("href", "/#start");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("H1, tips, pitfalls and FAQ are in the HTML", async ({ page }) => {
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("OG image preview");
    await expect(page.getByRole("heading", { name: "The 1200×630 rule" })).toBeVisible();
    await expect(page.getByTestId("og-tags-example")).toContainText('twitter:card" content="summary_large_image"');
    await expect(page.getByTestId("og-pitfalls").getByRole("listitem")).toHaveCount(6);
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(5);
    await expect(page.getByRole("heading", { name: "What size should an Open Graph image be?" })).toBeVisible();
  });
});
