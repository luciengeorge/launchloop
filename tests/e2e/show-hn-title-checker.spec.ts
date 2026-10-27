import { expect, test } from "@playwright/test";
import { HN_SOURCES, SHOW_HN_RULES } from "../../src/lib/show-hn-check";

const PATH = "/tools/show-hn-title-checker";
const GOOD = "Show HN: Gridcast, turn a CSV into a dashboard you can share by link";
const BAD = "Show HN: GRIDCAST, the best dashboard tool ever!";

test("Show HN checker has its own title, meta, canonical, share image and JSON-LD", async ({ page, request }) => {
  await page.goto(PATH);
  await expect(page).toHaveTitle("Show HN Title Checker: Test Against HN Rules · LaunchLoop");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Show HN title checker");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /^Free Show HN title checker: .*Hacker News's own rules.*No AI, no sign-up\.$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${PATH}$`));
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new RegExp(`${PATH}$`));
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", new RegExp(`${PATH}/opengraph-image`));
  await expect(page.locator('meta[name="twitter:image"]').first()).toHaveAttribute("content", new RegExp(`${PATH}/opengraph-image`));

  const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  const nodes = graph["@graph"] as { "@type": string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[];
  expect(nodes.map((n) => n["@type"])).toEqual(expect.arrayContaining(["WebApplication", "FAQPage", "BreadcrumbList"]));
  const faq = nodes.find((n) => n["@type"] === "FAQPage")!.mainEntity!;
  expect(faq).toHaveLength(5);
  expect(faq.map((q) => q.name)).toEqual(await page.locator("h2#faq + div h3").allInnerTexts());
  for (const q of faq) await expect(page.locator("h2#faq + div")).toContainText(q.acceptedAnswer.text.replace(/ <a [^>]+>.*<\/a>$/, ""));

  const image = await request.get(`${PATH}/opengraph-image`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
  expect(await (await request.get("/sitemap.xml")).text()).toContain(PATH);
  expect(await (await request.get("/llms.txt")).text()).toContain(PATH);
});

test("the full body is in the server HTML: intro, original element, every rule with its HN quote, examples and FAQ", async ({ request }) => {
  const html = await (await request.get(PATH)).text();
  for (const id of ['id="rules"', 'id="tips"', 'id="not-checked"', 'id="examples"', 'id="length"', 'id="faq"', 'id="sources"']) expect(html, id).toContain(id);
  expect(html).toContain('data-testid="showhn-intro"');
  expect(html).toContain("Our tests compare every quote, word for word, with copies of those pages fetched on");
  for (const rule of SHOW_HN_RULES.filter((r) => r.kind === "rule")) expect(html, rule.id).toContain(`data-rule="${rule.id}"`);
  expect(html).toContain("How long can a Show HN title be?");
  expect(html).not.toMatch(/\b80 characters\b/);
});

test("rules quote HN with links, tips are labelled, and dashes only appear inside quotes", async ({ page }) => {
  await page.goto(PATH);
  const rules = page.getByTestId("showhn-rules").locator(":scope > li");
  await expect(rules).toHaveCount(SHOW_HN_RULES.filter((r) => r.kind === "rule").length);
  for (const item of await rules.all()) {
    await expect(item.locator("q").first()).toBeVisible();
    await expect(item.locator('a[href^="https://news.ycombinator.com/"]').first()).toBeVisible();
    await expect(item).toContainText("HN rule");
  }
  await expect(page.getByTestId("showhn-rules").locator("q", { hasText: 'To post, submit a story whose title begins with "Show HN".' })).toBeVisible();
  await expect(page.getByTestId("showhn-tips").locator("li")).toHaveCount(SHOW_HN_RULES.filter((r) => r.kind === "tip").length);
  for (const source of Object.values(HN_SOURCES)) await expect(page.locator(`#sources ~ ul a[href="${source.url}"]`)).toBeVisible();
  for (const href of ["/how-to-write-a-show-hn-post", "/show-hn-launch-checklist", "/tools/product-hunt-tagline-checker", "/tools/og-preview", "/#start", "/pricing"]) {
    await expect(page.locator(`main a[href="${href}"]`).first(), href).toBeVisible();
  }
  const dashes = await page.locator("main").evaluate((el) =>
    Array.from(el.querySelectorAll("*"))
      .flatMap((node) => Array.from(node.childNodes))
      .filter((n) => n.nodeType === Node.TEXT_NODE && /[\u2013\u2014]/.test(n.textContent ?? ""))
      .filter((n) => n.parentElement?.closest("q") === null).length,
  );
  expect(dashes).toBe(0);
});

test("a passing title: every check passes and the verdict is announced", async ({ page }) => {
  await page.goto(PATH);
  const verdict = page.getByTestId("showhn-verdict");
  await expect(verdict).toHaveAttribute("aria-live", "polite");
  await expect(verdict).toHaveAttribute("data-verdict", "empty");

  await page.getByLabel("Show HN title", { exact: true }).fill(GOOD);
  await expect(page.getByTestId("showhn-count")).toHaveText(`${GOOD.length} characters`);
  await expect(verdict).toHaveAttribute("data-verdict", "pass");
  await expect(verdict).toHaveText("Passes every HN rule and tip this tool checks.");
  const checks = page.getByTestId("showhn-checks").locator(":scope > li");
  await expect(checks).toHaveCount(11);
  for (const status of await checks.evaluateAll((items) => items.map((li) => li.getAttribute("data-status")))) expect(status).toBe("pass");
  await expect(page.locator('[data-check="prefix"] q')).toHaveText('To post, submit a story whose title begins with "Show HN".');
  await expect(page.locator('[data-check="prefix"] a')).toHaveAttribute("href", HN_SOURCES.showhn.url);
  await expect(page.getByTestId("showhn-checker").locator('a[href="/show-hn-launch-checklist"]')).toBeVisible();

  await page.getByLabel("Your text or first comment").fill("I built Gridcast because I was pasting spreadsheet screenshots into Slack. No sign-up: the demo loads sample data.");
  await expect(verdict).toHaveAttribute("data-verdict", "pass");
  for (const id of ["signup", "emphasis", "howwhy"]) await expect(page.locator(`[data-check="${id}"]`)).toHaveAttribute("data-status", "pass");
});

test("a failing title and text: each broken rule warns, tips are labelled, and the link type is keyboard-operable", async ({ page }) => {
  await page.goto(PATH);
  const title = page.getByLabel("Show HN title", { exact: true });
  await title.fill(BAD);
  const verdict = page.getByTestId("showhn-verdict");
  await expect(verdict).toHaveAttribute("data-verdict", "warn");
  await expect(verdict).toHaveText("3 HN rules to look at.");
  for (const id of ["caps", "hype", "exclaim"]) await expect(page.locator(`[data-check="${id}"]`)).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="caps"]')).toContainText("Capitals: “GRIDCAST”");
  await expect(page.locator('[data-check="hype"]')).toContainText("Hype: “best”");
  await expect(page.getByTestId("showhn-checker").locator('a[href="/show-hn-launch-checklist"]')).toHaveCount(0);

  await title.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: "Something to try (app, site or repo)" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "A video" })).toBeChecked();
  await expect(page.locator('[data-check="media"]')).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="media"]')).toContainText("Add [video] to the end");

  await page.getByLabel("Your text or first comment").fill("Please upvote and leave a comment! You need to sign up with your email to try it. It is REALLY fast.");
  for (const id of ["asks", "signup", "emphasis"]) await expect(page.locator(`[data-check="${id}"]`)).toHaveAttribute("data-status", "warn");
  await expect(page.locator('[data-check="howwhy"]')).toHaveAttribute("data-kind", "tip");
  await expect(page.locator('[data-check="howwhy"]')).toContainText("Our tip");
  await expect(page.locator('[data-check="asks"]')).toContainText("HN rule");

  await title.fill("Show HN: Gridcast");
  await page.getByRole("radio", { name: "Something to try (app, site or repo)" }).check();
  await page.getByLabel("Your text or first comment").fill("");
  await expect(verdict).toHaveAttribute("data-verdict", "tips");
  await expect(verdict).toHaveText("Passes every HN rule this tool checks, with 1 tip to consider.");
});

test("no horizontal overflow at 375px, with long input and every check showing", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PATH);
  await page.getByLabel("Show HN title", { exact: true }).fill(`${BAD} gridcast-dashboards-for-everyone.app ${"x".repeat(80)}`);
  await page.getByRole("radio", { name: "A PDF" }).check();
  await page.getByLabel("Your text or first comment").fill(`Please upvote! SUPERCALIFRAGILISTICEXPIALIDOCIOUS ${"y".repeat(120)}`);
  await expect(page.getByTestId("showhn-checks").locator(":scope > li")).toHaveCount(14);
  const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(layout.scrollWidth, "document wider than a 375px viewport").toBeLessThanOrEqual(layout.clientWidth);
  for (const el of await page.locator("main q, main li, main p").all()) {
    const box = await el.boundingBox();
    if (box) expect(box.x + box.width, (await el.textContent())?.slice(0, 60)).toBeLessThanOrEqual(375 + 0.5);
  }
});

test("the checker is linked from the tools hub, the footer and both Show HN guides", async ({ page }) => {
  await page.goto("/tools");
  await expect(page.locator(`main a[href="${PATH}"]`).first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Free tools and guides" }).locator(`a[href="${PATH}"]`)).toBeVisible();
  for (const path of ["/show-hn-launch-checklist", "/how-to-write-a-show-hn-post"]) {
    await page.goto(path);
    await expect(page.locator(`article a[href="${PATH}"]`).first(), path).toHaveText("Show HN title checker");
  }
});
