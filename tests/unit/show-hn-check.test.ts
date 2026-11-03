import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { llmsText } from "@/lib/llms";
import { PAGES, toolPage } from "@/lib/pages";
import { SITE } from "@/lib/site";
import { SHOW_HN_CHECKER, SHOW_HN_FAQ, TOOLS } from "@/lib/tools";
import {
  HN_QUOTES,
  HN_SOURCES,
  HN_TITLE_LIMIT,
  NEWS_ARC,
  SHOW_HN_EXAMPLES,
  SHOW_HN_RULES,
  checkShowHn,
  type CheckId,
  type HnSource,
  type ShowHnInput,
} from "@/lib/show-hn-check";

const status = (input: ShowHnInput, id: CheckId) => checkShowHn(input).checks.find((c) => c.id === id)?.status;
const title = (t: string, id: CheckId) => status({ title: t }, id);
const comment = (c: string, id: CheckId) => status({ title: "Show HN: Gridcast, dashboards from a CSV file", comment: c }, id);

const GOOD = "Show HN: Gridcast, turn a CSV into a dashboard you can share by link";

/** A Show HN title of exactly `n` characters. */
const titleOfLength = (n: number, filler = "x") => `Show HN: ${filler.repeat(n - "Show HN: ".length)}`;

describe("Show HN title checks", () => {
  it("passes a plain, descriptive title on every check", () => {
    const result = checkShowHn({ title: GOOD });
    expect(result.verdict).toBe("pass");
    expect(result.checks.map((c) => c.id)).toEqual(["prefix", "caps", "exclaim", "hype", "domain", "number", "media", "upgrade", "describes", "offtopic", "asks"]);
    expect(result.checks.every((c) => c.status === "pass")).toBe(true);
    expect(result.titleLength).toBe(GOOD.length);
  });

  it("prefix: needs the title to begin with Show HN, spelled that way", () => {
    expect(title(GOOD, "prefix")).toBe("pass");
    expect(title("Show HN – Gridcast, dashboards from a CSV", "prefix")).toBe("pass");
    expect(title("show hn: Gridcast, dashboards from a CSV", "prefix")).toBe("warn");
    expect(title("Gridcast, dashboards from a CSV", "prefix")).toBe("warn");
    expect(title("I made Gridcast. Show HN: dashboards", "prefix")).toBe("warn");
  });

  it("prefix: the words must be exactly Show HN with one space, and not run into the next word", () => {
    expect(title("Show HN", "prefix")).toBe("pass");
    expect(title("Show HN:Gridcast, dashboards from a CSV", "prefix")).toBe("pass");
    expect(title("Show HN - Gridcast, dashboards from a CSV", "prefix")).toBe("pass");
    expect(title("Show  HN: Gridcast, dashboards from a CSV", "prefix")).toBe("warn");
    expect(title("Show\u00a0HN: Gridcast, dashboards from a CSV", "prefix")).toBe("warn");
    expect(title("Show HNews: Gridcast, dashboards from a CSV", "prefix")).toBe("warn");
    expect(title("Show HNGridcast", "prefix")).toBe("warn");
    const label = (t: string) => checkShowHn({ title: t }).checks.find((c) => c.id === "prefix")?.label;
    expect(label("Show  HN: Gridcast, dashboards")).toBe("Write it as “Show HN”");
    expect(label("Show HNews: Gridcast, dashboards")).toBe("“Show HN” runs into the next word");
    // The spacing slip doesn't hide the title body from the other checks.
    expect(title("Show  HN: GRIDCAST, dashboards from a CSV", "caps")).toBe("warn");
  });

  it("caps: flags shouted words but not acronyms or the Show HN prefix", () => {
    expect(title("Show HN: GRIDCAST, dashboards from a CSV", "caps")).toBe("warn");
    expect(title("Show HN: The NEW way to read logs", "caps")).toBe("warn");
    expect(title("Show HN: A JSON to YAML converter over HTTP with an API", "caps")).toBe("pass");
    expect(title("Show HN: A GPT-4 wrapper for SQL and CSV files", "caps")).toBe("pass");
    expect(checkShowHn({ title: "Show HN: GRIDCAST and REALLY fast" }).checks.find((c) => c.id === "caps")?.label).toBe("Capitals: “GRIDCAST”, “REALLY”");
  });

  it("exclaim: flags any exclamation point", () => {
    expect(title("Show HN: Gridcast, dashboards from a CSV!", "exclaim")).toBe("warn");
    expect(title("Show HN: Yo! A tiny chat app", "exclaim")).toBe("warn");
    expect(title(GOOD, "exclaim")).toBe("pass");
  });

  it("hype: flags superlatives and hype from the word list", () => {
    for (const t of ["the best dashboard", "an amazing tool", "a revolutionary editor", "the world's first AI shell", "a blazing fast parser", "a game-changing app"]) {
      expect(title(`Show HN: ${t} for CSV files`, "hype"), t).toBe("warn");
    }
    expect(title("Show HN: A fast parser for CSV files", "hype")).toBe("pass");
    expect(title("Show HN: Bestiary, a monster database", "hype")).toBe("pass");
  });

  it("domain: flags a site name in the title", () => {
    expect(title("Show HN: Gridcast.app, dashboards from a CSV", "domain")).toBe("warn");
    expect(title("Show HN: www.gridcast.com for dashboards", "domain")).toBe("warn");
    expect(title("Show HN: A Next.js starter with Node.js and Vue.js", "domain")).toBe("pass");
    expect(title("Show HN: Email me at hi@gridcast.app", "domain")).toBe("pass");
    expect(checkShowHn({ title: "Show HN: Gridcast.app, dashboards" }).checks.find((c) => c.id === "domain")?.label).toBe("Site name: “Gridcast.app”");
  });

  it("number: flags HN's own examples of gratuitous numbers, not meaningful ones", () => {
    expect(title("Show HN: 10 Ways To Do X", "number")).toBe("warn");
    expect(title("Show HN: 14 Amazing Ys", "number")).toBe("warn");
    expect(title("Show HN: 7 lessons from building a database", "number")).toBe("warn");
    expect(title("Show HN: The 5 Platonic Solids in WebGL", "number")).toBe("pass");
    expect(title("Show HN: A 4 KB JavaScript game", "number")).toBe("pass");
  });

  it("media: needs [video] or [pdf] at the end when the link is one", () => {
    const t = "Show HN: Building a split keyboard from scratch";
    expect(status({ title: t }, "media")).toBe("pass");
    expect(status({ title: t, link: "video" }, "media")).toBe("warn");
    expect(status({ title: `${t} [video]`, link: "video" }, "media")).toBe("pass");
    expect(status({ title: `${t} [Video]`, link: "video" }, "media")).toBe("pass");
    expect(status({ title: `${t} [pdf]`, link: "video" }, "media")).toBe("warn");
    expect(status({ title: `${t} [pdf]`, link: "pdf" }, "media")).toBe("pass");
    expect(status({ title: `[pdf] ${t}`, link: "pdf" }, "media")).toBe("warn");
  });

  it("upgrade: flags version bumps like HN's Foo 1.3.1 is out", () => {
    expect(title("Show HN: Foo 1.3.1 is out", "upgrade")).toBe("warn");
    expect(title("Show HN: Gridcast v2 now supports Excel", "upgrade")).toBe("warn");
    expect(title("Show HN: A Python 3.12 bytecode decompiler", "upgrade")).toBe("pass");
    expect(title(GOOD, "upgrade")).toBe("pass");
  });

  it("describes (tip): warns on a name with nothing after it", () => {
    expect(title("Show HN: Gridcast", "describes")).toBe("warn");
    expect(title("Show HN: Gridcast dashboards", "describes")).toBe("warn");
    expect(title("Show HN: Gridcast, CSV dashboards", "describes")).toBe("pass");
    const result = checkShowHn({ title: "Show HN: Gridcast" });
    expect(result.checks.find((c) => c.id === "describes")?.kind).toBe("tip");
    expect(result.verdict).toBe("tips");
  });
});

describe("checks on the title and the text", () => {
  it("offtopic: flags waitlists, newsletters, landing pages and fundraisers in either", () => {
    expect(title("Show HN: Join the waitlist for my budgeting app", "offtopic")).toBe("warn");
    expect(title("Show HN: My newsletter about Rust compilers", "offtopic")).toBe("warn");
    expect(title("Show HN: A keyboard on Kickstarter", "offtopic")).toBe("warn");
    expect(title("Show HN: Pre-order my split keyboard", "offtopic")).toBe("warn");
    expect(title("Show HN: Our crowdfunding page for a split keyboard", "offtopic")).toBe("warn");
    expect(comment("It's coming soon, but here's our landing page.", "offtopic")).toBe("warn");
    expect(title("Show HN: A self-hosted waitlist tool for SaaS launches", "offtopic")).toBe("pass");
    expect(title(GOOD, "offtopic")).toBe("pass");
  });

  it("asks: flags asking for upvotes or comments, not for feedback", () => {
    for (const c of [
      "Please upvote if you like it",
      "Leave a comment below!",
      "Pls vote for us",
      "Help us get to the front page",
      "Show some love",
      "Please upvote and leave a comment!",
      "Please leave a comment to help us rank.",
      "Please comment if you like it.",
      "Leave a comment below to help us rank. Feedback welcome.",
      "Please comment with your feedback and an upvote.",
    ]) {
      expect(comment(c, "asks"), c).toBe("warn");
    }
    expect(title("Show HN: Upvote this, a tiny voting app", "asks")).toBe("warn");
    for (const c of [
      "I'd love your feedback on the parser.",
      "Please share your feedback on the onboarding.",
      "Your feedback would help me get it right.",
      "Please try it and comment with any feedback.",
      "Please try it out and leave a comment with your thoughts.",
      "Comment below with any bugs or suggestions.",
    ]) {
      expect(comment(c, "asks"), c).toBe("pass");
    }
  });

  it("asks: a feedback request in one sentence doesn't excuse a solicitation in the next", () => {
    expect(comment("Please try it and comment with any feedback. Please upvote it too.", "asks")).toBe("warn");
    expect(comment("Leave a comment below! Feedback welcome.", "asks")).toBe("warn");
    expect(comment("Please try it and comment with any feedback.\nLeave a comment below!", "asks")).toBe("warn");
  });
});

describe("first comment checks", () => {
  it("runs only when there is text", () => {
    const ids = checkShowHn({ title: GOOD }).checks.map((c) => c.id);
    for (const id of ["signup", "emphasis", "howwhy"] as const) expect(ids).not.toContain(id);
    expect(checkShowHn({ title: GOOD, comment: "   " }).commentLength).toBe(0);
  });

  it("signup: flags a sign-up barrier unless the sentence says there isn't one", () => {
    expect(comment("You need to sign up with your email to try it.", "signup")).toBe("warn");
    expect(comment("Create an account and log in to see the dashboard.", "signup")).toBe("warn");
    expect(comment("You can't try it without signing up.", "signup")).toBe("warn");
    expect(comment("No sign-up needed: the demo loads sample data.", "signup")).toBe("pass");
    expect(comment("It works without an account.", "signup")).toBe("pass");
    expect(comment("I built it because my spreadsheet kept breaking.", "signup")).toBe("pass");
  });

  it("emphasis: flags capitals for emphasis, not acronyms", () => {
    expect(comment("It is REALLY fast.", "emphasis")).toBe("warn");
    expect(comment("It is *really* fast and speaks JSON over HTTP.", "emphasis")).toBe("pass");
  });

  it("howwhy (tip): looks for an explanation of how or why", () => {
    expect(comment("I built it because my spreadsheet kept breaking.", "howwhy")).toBe("pass");
    expect(comment("Here's how it works: a DuckDB query per chart.", "howwhy")).toBe("pass");
    expect(comment("Dark mode. Exports. Fast.", "howwhy")).toBe("warn");
    const result = checkShowHn({ title: GOOD, comment: "Dark mode. Exports. Fast." });
    expect(result.checks.find((c) => c.id === "howwhy")?.kind).toBe("tip");
    expect(result.verdict).toBe("tips");
  });
});

describe("verdict", () => {
  it("is warn when any HN rule warns, whatever the tips say", () => {
    expect(checkShowHn({ title: "Show HN: GRIDCAST" }).verdict).toBe("warn");
  });

  it("has no checks and passes for an empty title and text", () => {
    expect(checkShowHn({ title: "", comment: "" })).toEqual({ titleLength: 0, commentLength: 0, verdict: "pass", checks: [] });
  });

  it("counts characters, not UTF-16 units", () => {
    expect(checkShowHn({ title: "Show HN: 🚀" }).titleLength).toBe(10);
  });
});

describe("the submit form's title limit", () => {
  const lengthCheck = (t: string) => checkShowHn({ title: t }).checks.find((c) => c.id === "length");

  it("is 80 characters, from HN's published news.arc source", () => {
    expect(HN_TITLE_LIMIT).toBe(80);
    expect(NEWS_ARC.url).toMatch(/^https:\/\/github\.com\/arclanguage\/anarki\/blob\/master\/apps\/news\/news\.arc$/);
  });

  it("accepts a title of exactly 80 characters: no length check at all", () => {
    const t = titleOfLength(80);
    const result = checkShowHn({ title: t });
    expect(result.titleLength).toBe(80);
    expect(lengthCheck(t)).toBeUndefined();
    expect(result.checks.map((c) => c.id)).not.toContain("length");
  });

  it("warns at 81 characters, as a submit form check that is neither a rule nor a tip", () => {
    const t = titleOfLength(81);
    const result = checkShowHn({ title: t });
    expect(result.titleLength).toBe(81);
    const check = lengthCheck(t);
    expect(check).toMatchObject({ id: "length", kind: "form", status: "warn", label: "Over 80 characters" });
    expect(check?.detail).toBe("HN's submit form rejects titles longer than 80 characters. Yours is 81, so cut at least 1.");
    expect(check?.detail).not.toMatch(/guideline/i);
    expect(result.verdict).toBe("warn");
    expect(lengthCheck(titleOfLength(95))?.detail).toContain("Yours is 95, so cut at least 15.");
  });

  it("counts with charLength, so an emoji is one character and the surrounding spaces don't count", () => {
    expect(lengthCheck(titleOfLength(80, "🚀"))).toBeUndefined();
    expect(lengthCheck(titleOfLength(81, "🚀"))).toBeDefined();
    expect(lengthCheck(`   ${titleOfLength(80)}   `)).toBeUndefined();
  });

  it("makes the verdict warn even when every HN rule passes", () => {
    const result = checkShowHn({ title: titleOfLength(81, "a") });
    expect(result.checks.filter((c) => c.kind === "rule" && c.status === "warn").map((c) => c.id)).toEqual([]);
    expect(result.verdict).toBe("warn");
  });
});

describe("rules and their sources", () => {
  const FIXTURES = path.join(import.meta.dirname, "../fixtures/hn/2026-10-27");
  const FILES: Record<HnSource, string> = { showhn: "showhn.html", guidelines: "newsguidelines.html", faq: "newsfaq.html" };
  const pageText = Object.fromEntries(
    Object.entries(FILES).map(([source, file]) => [source, parse(readFileSync(path.join(FIXTURES, file), "utf8")).textContent.replace(/\s+/g, " ")]),
  ) as Record<HnSource, string>;

  it.each(Object.entries(HN_QUOTES))("quote %s appears word for word on the HN page as fetched on 27 October 2026", (_, quote) => {
    expect(pageText[quote.source]).toContain(quote.text);
  });

  it("quotes no en or em dashes, and links only HN's own pages", () => {
    for (const quote of Object.values(HN_QUOTES)) expect(quote.text).not.toMatch(/[\u2013\u2014]/);
    for (const source of Object.values(HN_SOURCES)) expect(source.url).toMatch(/^https:\/\/news\.ycombinator\.com\/[a-z]+\.html$/);
  });

  it("the submit form needs a login, and none of the HN pages we quote states a title length limit, so the limit is never quoted as a guideline", () => {
    const submit = parse(readFileSync(path.join(FIXTURES, "submit.html"), "utf8")).textContent;
    expect(submit).toContain("You have to be logged in to submit.");
    for (const text of Object.values(pageText)) expect(text).not.toMatch(/\b80 characters\b|title[^.]{0,40}\blimit/i);
  });

  it("every rule quotes HN and every tip is labelled as ours", () => {
    expect(new Set(SHOW_HN_RULES.map((r) => r.id)).size).toBe(SHOW_HN_RULES.length);
    for (const rule of SHOW_HN_RULES) {
      if (rule.kind === "rule") expect(rule.quotes.length, rule.id).toBeGreaterThan(0);
      else expect(rule.how, rule.id).toMatch(/^Our (tip|guess)/);
    }
  });

  it("every check the checker can return has a rule entry, and the reverse", () => {
    const all = checkShowHn({ title: GOOD, comment: "I built it because.", link: "video" }).checks.map((c) => c.id).sort();
    expect(all).toEqual(SHOW_HN_RULES.map((r) => r.id).sort());
  });
});

describe("registry", () => {
  const BASE = "https://launchloop.test";
  const ROOT = path.join(import.meta.dirname, "../..");

  it("is a tool with its own path, a 50 to 59 character title and a 138 to 158 character description, unlike the other tools", () => {
    expect(TOOLS).toContain(SHOW_HN_CHECKER);
    expect(SHOW_HN_CHECKER.path).toBe("/tools/show-hn-title-checker");
    const full = `${SHOW_HN_CHECKER.metaTitle} · ${SITE.name}`;
    expect(full.length).toBeGreaterThanOrEqual(50);
    expect(full.length).toBeLessThanOrEqual(59);
    expect(SHOW_HN_CHECKER.description.length).toBeGreaterThanOrEqual(138);
    expect(SHOW_HN_CHECKER.description.length).toBeLessThanOrEqual(158);
    for (const other of TOOLS.filter((t) => t !== SHOW_HN_CHECKER)) {
      expect(other.metaTitle).not.toBe(SHOW_HN_CHECKER.metaTitle);
      expect(other.description).not.toBe(SHOW_HN_CHECKER.description);
    }
    for (const text of [SHOW_HN_CHECKER.metaTitle, SHOW_HN_CHECKER.description, ...SHOW_HN_FAQ.flatMap((f) => [f.q, f.a])]) expect(text).not.toMatch(/[\u2013\u2014]/);
    for (const text of [SHOW_HN_CHECKER.description, ...SHOW_HN_FAQ.flatMap((f) => [f.q, f.a]), ...SHOW_HN_RULES.map((r) => r.how)]) expect(text).not.toMatch(/%|percent/i);
    expect(toolPage(SHOW_HN_CHECKER).image.url).toBe("/tools/show-hn-title-checker/opengraph-image");
  });

  it("the length FAQ answer says the submit form rejects titles over 80 characters, and doesn't call it a guideline", () => {
    const answer = SHOW_HN_FAQ.find((f) => f.q === "How long can a Show HN title be?")?.a ?? "";
    expect(answer).toContain("HN's submit form rejects titles longer than 80 characters");
    expect(answer).toContain("even though the written guidelines don't mention it");
    expect(answer).toContain("news.arc");
    expect(answer).not.toMatch(/doesn't say|no limit|not a limit/i);
  });

  it("how-it's-checked text matches the code: the fundraiser rule says pre-sale, never the pre-order wording the pricing test bans, and the tip says Our tip", () => {
    const rule = (id: string) => SHOW_HN_RULES.find((r) => r.id === id)!;
    expect(rule("offtopic").how).toContain("a pre-sale");
    expect(rule("offtopic").how).not.toMatch(/pre-?order/i);
    expect(rule("asks").how).toContain("Asking for feedback isn't flagged.");
    expect(rule("howwhy").how).not.toContain("Our guess at an HN sentence");
    expect(rule("howwhy").how).toMatch(/^Our tip, based on the Show HN request to explain how and why\./);
  });

  it("is in the sitemap, llms.txt and llms-full.txt, and the tools hub description names it", () => {
    expect(sitemap().find((e) => e.url.endsWith(SHOW_HN_CHECKER.path))?.lastModified).toBe("2026-10-27");
    for (const full of [false, true]) expect(llmsText(BASE, full, false)).toContain(`[Show HN title checker](${BASE}${SHOW_HN_CHECKER.path})`);
    expect(PAGES.tools.description).toContain("Show HN title");
    expect(PAGES.tools.updated).toBe("2026-10-27");
  });

  it("is linked from the Show HN checklist and the Show HN post guide", () => {
    for (const file of ["src/app/show-hn-launch-checklist/page.tsx", "src/app/how-to-write-a-show-hn-post/page.tsx"]) {
      expect(readFileSync(path.join(ROOT, file), "utf8"), file).toContain("<Link href={SHOW_HN_CHECKER.path}>Show HN title checker</Link>");
    }
  });

  it("has a quote log dated 27 October 2026 that lists every quote and source URL", () => {
    const log = readFileSync(path.join(ROOT, "docs/seo/2026-10-27-show-hn-title-checker.md"), "utf8").replace(/\s+/g, " ");
    expect(log).toContain("2026-10-27");
    for (const source of Object.values(HN_SOURCES)) expect(log).toContain(source.url);
    expect(log).toContain("https://news.ycombinator.com/submit");
    expect(log).toContain(NEWS_ARC.url);
    expect(log).toContain("title-limit* 80");
    for (const quote of Object.values(HN_QUOTES)) expect(log, quote.text).toContain(quote.text);
  });
});

describe("before and after examples", () => {
  it.each(SHOW_HN_EXAMPLES.map((ex) => [ex.before.title, ex] as const))("%s fails exactly the checks it claims, and its fix passes every check", (_, ex) => {
    const before = checkShowHn({ ...ex.before, link: ex.link });
    expect(before.checks.filter((c) => c.status === "warn").map((c) => c.id).sort()).toEqual([...ex.fixes].sort());
    const after = checkShowHn({ ...ex.after, link: ex.link });
    expect(after.verdict).toBe("pass");
    expect(after.checks.length).toBeGreaterThan(0);
  });

  it("uses no en or em dashes in the example copy", () => {
    for (const ex of SHOW_HN_EXAMPLES) expect(JSON.stringify(ex)).not.toMatch(/[\u2013\u2014]/);
  });
});
