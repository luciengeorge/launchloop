import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const flag = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/newsletter-flag-server", () => ({ isNewsletterCalendarOn: async () => flag.on }));
// GuideLayout renders the async PreviewCta, which a static render can't; the page's own content is what's checked here.
vi.mock("@/components/guide-layout", () => ({ GuideLayout: ({ children }: { children: ReactNode }) => children }));

const { default: sitemap } = await import("@/app/sitemap");
const { default: LaunchCalendarPage, generateMetadata: calendarMetadata } = await import("@/app/7-day-launch-calendar/page");
const { generateMetadata: indexMetadata } = await import("@/app/newsletter/page");
const { generateMetadata: issueMetadata } = await import("@/app/newsletter/1/page");
const { BLOG_POSTS, postPath } = await import("@/lib/blog");
const { GUIDES, guidePath, LAUNCH_CALENDAR } = await import("@/lib/guides");
const { llmsText } = await import("@/lib/llms");
const { calendarRewardPages, cardPages, indexablePages, PAGES } = await import("@/lib/pages");
const { SITE } = await import("@/lib/site");
const { TOOLS } = await import("@/lib/tools");

const CONTENT = readFileSync(path.join(import.meta.dirname, "fixtures/7-day-launch-calendar-content-2026-11-06.md"), "utf8");
const DASHES = /[\u2012-\u2015]/;
const REWARD_PATHS = ["/7-day-launch-calendar", "/newsletter", "/newsletter/1"];
const paths = async () => (await sitemap()).map((e) => new URL(e.url).pathname);

beforeEach(() => {
  flag.on = false;
});

describe("newsletter-calendar-reward off (production until Lucien's OK)", () => {
  it("the sitemap is exactly what it was: no calendar, no newsletter archive", async () => {
    const listed = await paths();
    for (const p of REWARD_PATHS) expect(listed).not.toContain(p);
    expect(listed).toEqual(indexablePages().map((p) => p.path));
    expect(listed).toHaveLength(Object.keys(PAGES).length + TOOLS.length + GUIDES.length + BLOG_POSTS.length);
  });

  it("the three pages are noindex (links still followed), with the rest of their metadata as normal", async () => {
    for (const metadata of [await calendarMetadata(), await indexMetadata(), await issueMetadata()]) {
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(metadata.alternates?.canonical).toBeTruthy();
    }
  });

  it("the calendar is in no list that GUIDES feeds: the footer, llms.txt, the hubs or More guides", () => {
    expect(GUIDES.map((g) => g.slug)).not.toContain(LAUNCH_CALENDAR.slug);
    for (const full of [false, true]) expect(llmsText("https://launchloop.test", full, false)).not.toMatch(/7-day-launch-calendar|\/newsletter/);
  });
});

describe("newsletter-calendar-reward on", () => {
  it("adds the calendar and the archive to the sitemap, once each, with their lastmod", async () => {
    flag.on = true;
    const entries = await sitemap();
    for (const p of REWARD_PATHS) expect(entries.filter((e) => new URL(e.url).pathname === p), p).toHaveLength(1);
    expect(entries.find((e) => e.url.endsWith("/7-day-launch-calendar"))?.lastModified).toBe("2026-11-06");
    expect(entries.find((e) => e.url.endsWith("/newsletter/1"))?.lastModified).toBe("2026-10-27");
    expect(entries).toHaveLength(indexablePages().length + 3);
  });

  it("the three pages are indexable, with canonical, Open Graph and summary_large_image cards", async () => {
    flag.on = true;
    const issue = await issueMetadata();
    expect(issue.robots).toEqual({ index: true, follow: true });
    expect(issue.title).toBe("Before you submit to BetaList: 5 checks");
    expect(issue.alternates?.canonical).toBe("/newsletter/1");
    expect(issue.openGraph).toMatchObject({ type: "article", title: `Before you submit to BetaList: 5 checks · ${SITE.name}`, images: [{ url: "/og/newsletter-1", width: 1200, height: 630 }] });
    expect(issue.twitter).toMatchObject({ card: "summary_large_image" });
    expect((await indexMetadata()).robots).toEqual({ index: true, follow: true });
    const calendar = await calendarMetadata();
    expect(calendar.robots).toEqual({ index: true, follow: true });
    expect(calendar.openGraph).toMatchObject({ images: [{ url: "/og/7-day-launch-calendar" }] });
  });
});

describe("share cards", () => {
  it("exist for the calendar and the archive whatever the flag, each under one /og/<slug> segment", () => {
    const cards = cardPages();
    expect(cards).toContainEqual({ slug: "7-day-launch-calendar", card: { eyebrow: "Guide", headline: "The 7-day launch calendar" } });
    expect(cards).toContainEqual({ slug: "newsletter", card: { eyebrow: "Newsletter", headline: "Weekly launch teardowns" } });
    expect(cards).toContainEqual({ slug: "newsletter-1", card: { eyebrow: "Newsletter · Issue 1", headline: "Before you submit to BetaList, check these 5 things" } });
    expect(new Set(cards.map((c) => c.slug)).size).toBe(cards.length);
    for (const page of calendarRewardPages()) expect(page.image.url).toMatch(/^\/og\/[^/]+$/);
  });
});

describe("the calendar guide", () => {
  const html = renderToStaticMarkup(createElement(LaunchCalendarPage));
  const root = parse(html);
  const text = root.text.replace(/\s+/g, " ");

  it("has metadata inside the same SEO limits as every guide, and a unique title and description", () => {
    const g = LAUNCH_CALENDAR;
    const title = `${g.metaTitle} · ${SITE.name}`;
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(59);
    expect(g.description.length).toBeGreaterThanOrEqual(138);
    expect(g.description.length).toBeLessThanOrEqual(158);
    for (const other of [...GUIDES, ...BLOG_POSTS]) {
      expect(other.metaTitle).not.toBe(g.metaTitle);
      expect(other.description).not.toBe(g.description);
    }
    expect(`${g.title} ${g.metaTitle} ${g.description}`).not.toMatch(DASHES);
  });

  it("lists all seven days in order, then the week after and the limits", () => {
    const headings = root.querySelectorAll("h2").map((h) => h.text);
    expect(headings).toEqual([
      "Day 1: foundations (6 days out)",
      "Day 2: the share card",
      "Day 3: Product Hunt listing draft",
      "Day 4: BetaList and one free directory",
      "Day 5: Indie Hackers (and other communities)",
      "Day 6: prep day (1 day out)",
      "Day 7: launch day",
      "After the week",
      "The limits",
    ]);
    for (const heading of headings.slice(0, 8)) expect(CONTENT).toContain(`## ${heading}\n`);
  });

  it("gives every task a checkbox named by its title, and every title comes from the content draft", () => {
    const boxes = root.querySelectorAll('input[type="checkbox"]');
    expect(boxes.length).toBe(35);
    for (const box of boxes) {
      const title = root.getElementById(box.getAttribute("aria-labelledby")!);
      expect(title, box.id).toBeTruthy();
      expect(CONTENT.replace(/`/g, ""), title!.text).toContain(title!.text);
    }
  });

  it("cites a LaunchLoop page that exists for every task that names one, and links nowhere else", () => {
    const known = new Set([...GUIDES.map(guidePath), ...BLOG_POSTS.map(postPath), ...TOOLS.map((t) => t.path)]);
    const hrefs = root.querySelectorAll("a").map((a) => a.getAttribute("href")!);
    expect(hrefs.length).toBeGreaterThan(30);
    for (const href of hrefs) expect(known.has(href), href).toBe(true);
  });

  it("has no number the content draft doesn't, no dashes and no hype", () => {
    for (const number of text.match(/\d[\d,.:x]*/g) ?? []) expect(CONTENT, number).toContain(number.replace(/[.,:]$/, ""));
    expect(text).not.toMatch(DASHES);
    expect(text).not.toMatch(/exclusive|subscribers only|guaranteed|secret|ultimate/i);
    expect(text).toContain("This calendar is free prep, not a promise of visitors or signups.");
  });
});
