import { expect, test, type Page } from "@playwright/test";
import { HN_SOURCES, NEWS_ARC, SHOW_HN_RULES } from "../../src/lib/show-hn-check";

const PATH = "/tools/show-hn-title-checker";
const GOOD = "Show HN: Gridcast, turn a CSV into a dashboard you can share by link";
const BAD = "Show HN: GRIDCAST, the best dashboard tool ever!";
const BADGE = { rule: "HN rule", tip: "Our tip", form: "Submit form" } as const;
const NOTE_80 = "HN's submit form rejects titles longer than 80 characters. That comes from HN's published news.arc source, not the guidelines.";

/** A title that passes every check, padded with a last word to exactly `n` characters. */
const titleOfLength = (n: number) => {
  const base = "Show HN: Gridcast, dashboards from a CSV ";
  return `${base}${"x".repeat(n - base.length)}`;
};

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
  const app = nodes.find((n) => n["@type"] === "WebApplication") as unknown as { featureList: string[] };
  expect(app.featureList).toContain("Character count, with a note when the title is over the 80 characters HN's submit form rejects");
  expect(app.featureList.join(" ")).not.toMatch(/invented|no length limit/i);
  expect(faq[0].acceptedAnswer.text).toContain("HN's submit form rejects titles longer than 80 characters, even though the written guidelines don't mention it.");
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
  const length = html.slice(html.indexOf('id="length"'), html.indexOf('id="after-the-title"')).replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
  expect(length).toContain("rejects titles longer than 80 characters, even though the written guidelines don't mention it");
  expect(length).toContain("published news.arc source");
  expect(length).not.toMatch(/Not one HN states|no length limit/i);
  expect(html).toContain(`href="${NEWS_ARC.url}"`);
  expect(html).toContain("a pre-sale");
  expect(html).not.toContain("Our guess at an HN sentence");
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

/** Each listed check shows exactly one badge, and its text matches its kind: "Our tip" for the two tips, "HN rule" for the rest. */
async function expectBadges(page: Page, ids: string[]) {
  for (const id of ids) {
    const item = page.locator(`[data-check="${id}"]`);
    const kind = SHOW_HN_RULES.find((r) => r.id === id)!.kind;
    await expect(item, id).toHaveAttribute("data-kind", kind);
    await expect(item.getByTestId("showhn-badge"), id).toHaveCount(1);
    await expect(item.getByTestId("showhn-badge"), id).toHaveText(BADGE[kind]);
  }
}

test("a passing title: every check passes and the verdict is announced", async ({ page }) => {
  await page.goto(PATH);
  const verdict = page.getByTestId("showhn-verdict");
  await expect(verdict).toHaveAttribute("aria-live", "polite");
  await expect(verdict).toHaveAttribute("data-verdict", "empty");
  await expect(verdict).toHaveText("Start typing your title. The checks update as you go.");
  await expect(page.getByTestId("showhn-checker")).toContainText(NOTE_80);

  await page.getByLabel("Show HN title", { exact: true }).fill(GOOD);
  await expect(page.getByTestId("showhn-count")).toHaveText(`${GOOD.length} characters`);
  await expect(verdict).toHaveAttribute("data-verdict", "pass");
  await expect(verdict).toHaveText("Passes every HN rule and tip this tool checks.");
  const checks = page.getByTestId("showhn-checks").locator(":scope > li");
  await expect(checks).toHaveCount(11);
  for (const status of await checks.evaluateAll((items) => items.map((li) => li.getAttribute("data-status")))) expect(status).toBe("pass");
  await expectBadges(page, ["prefix", "caps", "exclaim", "hype", "domain", "number", "media", "upgrade", "describes", "offtopic", "asks"]);
  await expect(page.locator('[data-check="prefix"] q')).toHaveText('To post, submit a story whose title begins with "Show HN".');
  await expect(page.locator('[data-check="prefix"] a')).toHaveAttribute("href", HN_SOURCES.showhn.url);
  await expect(page.getByTestId("showhn-checker").locator('a[href="/show-hn-launch-checklist"]')).toBeVisible();

  await page.getByLabel("Your text or first comment").fill("I built Gridcast because I was pasting spreadsheet screenshots into Slack. No sign-up: the demo loads sample data.");
  await expect(verdict).toHaveAttribute("data-verdict", "pass");
  for (const id of ["signup", "emphasis", "howwhy"]) await expect(page.locator(`[data-check="${id}"]`)).toHaveAttribute("data-status", "pass");
  await expectBadges(page, ["prefix", "caps", "exclaim", "hype", "domain", "number", "media", "upgrade", "describes", "offtopic", "asks", "signup", "emphasis", "howwhy"]);
});

test("a failing title and text: each broken rule warns, tips are labelled, and the link type is keyboard-operable", async ({ page }) => {
  await page.goto(PATH);
  const title = page.getByLabel("Show HN title", { exact: true });
  await title.fill(BAD);
  const verdict = page.getByTestId("showhn-verdict");
  await expect(verdict).toHaveAttribute("data-verdict", "warn");
  await expect(verdict).toHaveText("3 HN rules to look at.");
  for (const id of ["caps", "hype", "exclaim"]) await expect(page.locator(`[data-check="${id}"]`)).toHaveAttribute("data-status", "warn");
  const statuses = await page.getByTestId("showhn-checks").locator(":scope > li").evaluateAll((items) => items.map((li) => li.getAttribute("data-status")));
  expect(statuses).toEqual([...statuses].sort((a, b) => (a === b ? 0 : a === "warn" ? -1 : 1)));
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
  await expectBadges(page, ["prefix", "caps", "exclaim", "hype", "media", "asks", "signup", "emphasis", "describes", "howwhy"]);

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
  await expect(page.getByTestId("showhn-checks").locator(":scope > li")).toHaveCount(15);
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

test("title length: 80 characters passes, 81 shows a Submit form check that isn't labelled as an HN rule or a guideline quote", async ({ page }) => {
  await page.goto(PATH);
  const title = page.getByLabel("Show HN title", { exact: true });
  const count = page.getByTestId("showhn-count");
  const verdict = page.getByTestId("showhn-verdict");
  const length = page.locator('[data-check="length"]');

  await title.fill(titleOfLength(80));
  await expect(count).toHaveText("80 characters");
  await expect(count).toHaveAttribute("data-over-limit", "false");
  await expect(length).toHaveCount(0);
  await expect(page.getByTestId("showhn-checks").locator("li")).toHaveCount(11);

  await title.fill(titleOfLength(81));
  await expect(count).toHaveText("81 characters");
  await expect(count).toHaveAttribute("data-over-limit", "true");
  await expect(length).toHaveCount(1);
  await expect(length).toHaveAttribute("data-status", "warn");
  await expect(length).toHaveAttribute("data-kind", "form");
  await expect(length.getByTestId("showhn-badge")).toHaveText("Submit form");
  await expect(length).toContainText("Over 80 characters");
  await expect(length).toContainText("HN's submit form rejects titles longer than 80 characters. Yours is 81, so cut at least 1.");
  await expect(length).toContainText("This comes from HN's submit form and its published source, not from a guideline");
  await expect(length).not.toContainText("HN rule");
  await expect(length.locator("q")).toHaveCount(0);
  await expect(length.locator(`a[href="${NEWS_ARC.url}"]`)).toBeVisible();
  await expect(verdict).toHaveAttribute("data-verdict", "warn");
  await expect(verdict).toHaveText("HN's submit form would reject this title.");
  // It is the only warning, so it sorts ahead of every pass.
  await expect(page.getByTestId("showhn-checks").locator(":scope > li").first()).toHaveAttribute("data-check", "length");
  await expect(page.getByTestId("showhn-checks").locator('li[data-status="warn"]')).toHaveCount(1);

  await title.fill(titleOfLength(80));
  await expect(length).toHaveCount(0);
  await expect(verdict).toHaveAttribute("data-verdict", "pass");
});

test("a plain feedback request isn't flagged as asking for comments, but real solicitation still is", async ({ page }) => {
  await page.goto(PATH);
  await page.getByLabel("Show HN title", { exact: true }).fill(GOOD);
  const text = page.getByLabel("Your text or first comment");
  const asks = page.locator('[data-check="asks"]');
  await text.fill("Please try it and comment with any feedback.");
  await expect(asks).toHaveAttribute("data-status", "pass");
  await expect(asks).toContainText("Asking for feedback isn't flagged.");
  await text.fill("Please leave a comment to help us rank.");
  await expect(asks).toHaveAttribute("data-status", "warn");
  await text.fill("Please upvote and leave a comment!");
  await expect(asks).toHaveAttribute("data-status", "warn");
});

test("the Show HN prefix must be exactly Show HN: a double space or a run-on word warns", async ({ page }) => {
  await page.goto(PATH);
  const title = page.getByLabel("Show HN title", { exact: true });
  const prefix = page.locator('[data-check="prefix"]');
  await title.fill("Show  HN: Gridcast, turn a CSV into a dashboard");
  await expect(prefix).toHaveAttribute("data-status", "warn");
  await expect(prefix).toContainText("Write it as “Show HN”");
  await title.fill("Show HNews: Gridcast, turn a CSV into a dashboard");
  await expect(prefix).toHaveAttribute("data-status", "warn");
  await expect(prefix).toContainText("“Show HN” runs into the next word");
  await title.fill(GOOD);
  await expect(prefix).toHaveAttribute("data-status", "pass");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the verdict doesn't claim the checks update as you go, and the rules and length note are still in the page", async ({ page, request }) => {
    await page.goto(PATH);
    await expect(page.getByTestId("showhn-verdict")).toHaveText("");
    await expect(page.locator("main")).not.toContainText("update as you go");
    // Read the server HTML: the browser doesn't expose <noscript> contents as text.
    expect(await (await request.get(PATH)).text()).toMatch(/<noscript>(?:(?!<\/noscript>)[\s\S])*The live checker needs JavaScript\./);
    await expect(page.getByTestId("showhn-checker")).toContainText(NOTE_80);
    await expect(page.getByTestId("showhn-rules").locator(":scope > li").first()).toBeVisible();
  });
});
