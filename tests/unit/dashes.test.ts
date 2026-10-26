import { describe, expect, it } from "vitest";
import { sanitizeDashes, sanitizeGenerated } from "@/lib/dashes";

describe("sanitizeDashes", () => {
  it("fixes the example.com tagline from production", () => {
    expect(sanitizeDashes("Reserved domain for docs and examples\u2014use without asking")).toBe("Reserved domain for docs and examples: use without asking");
  });

  it.each([
    ["spaced em dash, elaboration", "Fast, private analytics \u2014 no cookies, no banners", "Fast, private analytics: no cookies, no banners"],
    ["unspaced em dash, elaboration", "One dashboard\u2014every metric that matters", "One dashboard: every metric that matters"],
    ["spaced en dash, elaboration", "Ship your launch kit \u2013 written from your own repo", "Ship your launch kit: written from your own repo"],
    ["spaced en dash before a conjunction", "I built it \u2013 and it works", "I built it, and it works"],
    ["unspaced em dash before a conjunction", "Small and fast\u2014but not basic", "Small and fast, but not basic"],
    ["short tail", "Is it worth it\u2014really?", "Is it worth it, really?"],
    ["a sentence that already has a colon", "Note: it reads your README \u2014 nothing else at all", "Note: it reads your README, nothing else at all"],
    ["after a question mark", "Tired of guessing?\u2014 Pulse shows you who visits", "Tired of guessing? Pulse shows you who visits"],
    ["dash at the end", "Launch day is here \u2014", "Launch day is here"],
    ["dash before punctuation", "It works \u2014.", "It works."],
  ])("%s", (_name, input, expected) => {
    expect(sanitizeDashes(input)).toBe(expected);
  });

  it.each([
    ["2\u20133 days", "2-3 days"],
    ["10\u201320% faster", "10-20% faster"],
    ["$5\u2013$10 a month", "$5-$10 a month"],
    ["from 2020 \u2013 2024", "from 2020-2024"],
    ["1.5\u20132.5 hrs", "1.5-2.5 hrs"],
    ["pages 3\u20147", "pages 3-7"],
  ])("number range %s", (input, expected) => {
    expect(sanitizeDashes(input)).toBe(expected);
  });

  it.each([
    ["Jan 5 \u2013 Feb 3", "Jan 5 - Feb 3"],
    ["9am \u2013 5pm", "9am - 5pm"],
    ["5 Jan \u2013 3 Feb 2026", "5 Jan - 3 Feb 2026"],
    ["Open 9am\u20135pm daily", "Open 9am-5pm daily"],
    ["COVID\u201319 safe", "COVID-19 safe"],
    ["Mon\u2012Fri 9\u20125", "Mon-Fri 9-5"],
  ])("an en or figure dash next to a token with a digit is a range and keeps its spacing: %s", (input, expected) => {
    expect(sanitizeDashes(input)).toBe(expected);
  });

  it.each([
    ["Day 1\u2014shipped it", "Day 1, shipped it"],
    ["Version 2 \u2014 3 new features in one release", "Version 2: 3 new features in one release"],
  ])("an em dash next to a digit is still punctuation: %s", (input, expected) => {
    expect(sanitizeDashes(input)).toBe(expected);
  });

  it.each([
    ["horizontal bar U+2015", "Notes\u2015fast and simple to use", "Notes: fast and simple to use"],
    ["figure dash U+2012 in a number", "Call 555\u20121234 today", "Call 555-1234 today"],
    ["figure dash U+2012 as punctuation", "Small \u2012 but complete", "Small, but complete"],
  ])("%s", (_name, input, expected) => {
    expect(sanitizeDashes(input)).toBe(expected);
  });

  it("leaves the minus sign (U+2212) alone", () => {
    for (const text of ["\u22125\u00b0C at night", "2 \u2212 3 = \u22121", "Fast \u2014 \u22125\u00b0C"]) expect(sanitizeDashes(text)).toContain("\u2212");
    expect(sanitizeDashes("2 \u2212 3 = \u22121")).toBe("2 \u2212 3 = \u22121");
  });

  it("only collapses the spaces the dash itself leaves: indentation and aligned text keep theirs", () => {
    expect(sanitizeDashes("a \u2014 b\n    x")).toBe("a, b\n    x");
    expect(sanitizeDashes("  \u2014 item\n    code   block")).toBe("  - item\n    code   block");
    expect(sanitizeDashes("Ship it  now   \u2014   and   later")).toBe("Ship it  now, and   later");
    expect(sanitizeDashes("Col A    Col B\nx \u2014 y")).toBe("Col A    Col B\nx, y");
  });

  it("a run of dashes is one dash, at the start of a line and inside it", () => {
    expect(sanitizeDashes("\u2014\u2014double")).toBe("- double");
    expect(sanitizeDashes("  \u2013\u2014 item")).toBe("  - item");
    expect(sanitizeDashes("Wait\u2014\u2014this is the good part")).toBe("Wait: this is the good part");
  });

  it("URLs and code spans are left exactly as they are", () => {
    expect(sanitizeDashes("https://ex.com/c\u2014d")).toBe("https://ex.com/c\u2014d");
    expect(sanitizeDashes("Docs at https://ex.com/a\u2013b \u2014 it explains everything")).toBe("Docs at https://ex.com/a\u2013b: it explains everything");
    expect(sanitizeDashes("Run `npm run a\u2014b` \u2014 then ship it")).toBe("Run `npm run a\u2014b`, then ship it");
    expect(sanitizeDashes("`x\u2014y` and `z\u2013w`\u2014both work fine here")).toBe("`x\u2014y` and `z\u2013w`: both work fine here");
  });

  it.each([
    ["50k digits then a dash", `${"1".repeat(50_000)}\u2014`],
    ["50k digits, a dash, a digit", `${"1".repeat(50_000)}\u20132`],
    ["50k digits with commas", `${"1,".repeat(25_000)}\u2013`],
    ["50k spaces then a dash", `${" ".repeat(50_000)}\u2014x`],
    ["a 50k-letter word then a dash", `${"a".repeat(50_000)} \u2014 b`],
  ])("stays linear on hostile input: %s", (_name, input) => {
    const started = performance.now();
    const out = sanitizeDashes(input);
    expect(performance.now() - started).toBeLessThan(100);
    expect(out).not.toMatch(/[\u2012-\u2015]/);
  });

  it("an unspaced en dash between words is a compound and becomes a hyphen", () => {
    expect(sanitizeDashes("A client\u2013server sync for notes")).toBe("A client-server sync for notes");
  });

  it("leaves plain hyphens in compound words alone", () => {
    const text = "A well-known, self-hosted, open-source tool for long-term notes - and a co-op";
    expect(sanitizeDashes(text)).toBe(text);
  });

  it("several dashes in one string", () => {
    expect(sanitizeDashes("My app \u2014 built in a weekend \u2014 ships today. It's free\u2014no account needed, ever. Plans cost $5\u2013$9.")).toBe(
      "My app, built in a weekend, ships today. It's free: no account needed, ever. Plans cost $5-$9.",
    );
    expect(sanitizeDashes("Fast \u2013 private \u2013 free")).toBe("Fast, private, free");
  });

  it("dashes used as list markers become hyphens, one line at a time", () => {
    expect(sanitizeDashes("What it does:\n\u2014 Reads your README\n\u2013 Writes the launch copy \u2014 in your voice")).toBe(
      "What it does:\n- Reads your README\n- Writes the launch copy: in your voice",
    );
  });

  it("is deterministic and idempotent, with no dash left", () => {
    const input = "Ship it\u2014today \u2013 or tomorrow\u2014 your call. 3\u20135 steps.";
    const once = sanitizeDashes(input);
    expect(sanitizeDashes(input)).toBe(once);
    expect(sanitizeDashes(once)).toBe(once);
    expect(once).not.toMatch(/[\u2013\u2014]/);
    expect(once).not.toMatch(/ {2}|\s[,:]/);
  });

  it("returns text without dashes unchanged", () => {
    const text = "Find any screenshot by the words in it";
    expect(sanitizeDashes(text)).toBe(text);
  });
});

describe("sanitizeGenerated", () => {
  it("cleans every string at any depth and keeps URL fields as they are", () => {
    const value = {
      tagline: "Notes\u2014without the clutter",
      features: [{ title: "Sync\u2013fast", description: "Works offline \u2014 and syncs later" }],
      xThread: ["Day 1\u2014shipped it", "2\u20133 hours a week"],
      url: "https://example.com/a\u2013b",
      count: 3,
      flag: true,
      nothing: null,
    };
    expect(sanitizeGenerated(value)).toEqual({
      tagline: "Notes, without the clutter",
      features: [{ title: "Sync-fast", description: "Works offline, and syncs later" }],
      xThread: ["Day 1, shipped it", "2-3 hours a week"],
      url: "https://example.com/a\u2013b",
      count: 3,
      flag: true,
      nothing: null,
    });
  });
});
