import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DIRECTORY_COLUMNS, DirectoryCsvError, directoriesCsv, freeDirectoryRow, parseDirectories, submitUrl, utmLink, type Directory } from "@/lib/directory-csv";

const HEADER = "rank,name,url,submit_url,category,pricing,price_usd,badge_required,backlink_required,dofollow,dr,approval_time,tagline_max,description_max,notes,utm_source";
const shipped = readFileSync(path.join(process.cwd(), "data/directory-pack/directories.csv"), "utf8");
const GOOD_ROW = '1,Launching Next,https://www.launchingnext.com/,https://www.launchingnext.com/submit/,launchpad,freemium,0,no,no,yes,57,"about 1 day, reviewed",60,260,"Our experience: submitted. checked 2026-11-16 (home 200)",launchingnext';

const issuesOf = (csv: string) => {
  try {
    parseDirectories(csv);
  } catch (error) {
    if (error instanceof DirectoryCsvError) return error.issues;
    throw error;
  }
  return [];
};

describe("the shipped directories.csv", () => {
  it("has exactly the agreed header", () => {
    expect(shipped.split(/\r?\n/)[0]).toBe(HEADER);
    expect(DIRECTORY_COLUMNS.join(",")).toBe(HEADER);
  });

  it("passes the schema on every row", () => {
    expect(issuesOf(shipped)).toEqual([]);
  });

  it("ranks run from 1 with no gaps, and the free top 20 all have a free path", () => {
    const rows = parseDirectories(shipped);
    expect(rows.map((r) => r.rank)).toEqual(rows.map((_, i) => i + 1));
    expect(rows.slice(0, 20).every((r) => r.pricing !== "paid")).toBe(true);
  });
});

describe("parseDirectories", () => {
  it("reads quoted fields, CRLF line endings, blank integers and enums", () => {
    const [row] = parseDirectories(`${HEADER}\r\n${GOOD_ROW.replace(",60,260,", ",,,")}\r\n`);
    expect(row).toEqual({
      rank: 1,
      name: "Launching Next",
      url: "https://www.launchingnext.com/",
      submit_url: "https://www.launchingnext.com/submit/",
      category: "launchpad",
      pricing: "freemium",
      price_usd: 0,
      badge_required: "no",
      backlink_required: "no",
      dofollow: "yes",
      dr: 57,
      approval_time: "about 1 day, reviewed",
      tagline_max: null,
      description_max: null,
      notes: "Our experience: submitted. checked 2026-11-16 (home 200)",
      utm_source: "launchingnext",
    } satisfies Directory);
  });

  it.each([
    ["a wrong header", `${HEADER.replace("dr,", "domain_rating,")}\n${GOOD_ROW}`, /header/],
    ["pricing outside free|freemium|paid", `${HEADER}\n${GOOD_ROW.replace(",freemium,", ",cheap,")}`, /rank 1: pricing/],
    ["a yes|no|unknown column with another value", `${HEADER}\n${GOOD_ROW.replace(",yes,57,", ",maybe,57,")}`, /rank 1: dofollow/],
    ["a non-integer dr", `${HEADER}\n${GOOD_ROW.replace(",57,", ",5.7,")}`, /rank 1: dr/],
    ["a non-integer tagline_max", `${HEADER}\n${GOOD_ROW.replace(",60,260,", ",sixty,260,")}`, /rank 1: tagline_max/],
    ["a missing column", `${HEADER}\n${GOOD_ROW.replace(",launchingnext", "")}`, /line 2: 15 columns/],
    ["a url that isn't http(s)", `${HEADER}\n${GOOD_ROW.replace("https://www.launchingnext.com/,", "launchingnext.com,")}`, /rank 1: url/],
    ["a duplicate rank", `${HEADER}\n${GOOD_ROW}\n${GOOD_ROW}`, /rank 1: duplicate rank/],
    ["an empty name", `${HEADER}\n${GOOD_ROW.replace("Launching Next", "")}`, /rank 1: name/],
  ])("fails on %s", (_label, csv, reason) => {
    expect(() => parseDirectories(csv)).toThrow(DirectoryCsvError);
    expect(issuesOf(csv).join("\n")).toMatch(reason);
  });
});

describe("links", () => {
  const [row] = parseDirectories(`${HEADER}\n${GOOD_ROW}`);

  it("tags the buyer's URL with the row's utm_source and utm_medium=directory, keeping its own query", () => {
    const link = new URL(utmLink("https://snapshelf.app/?ref=x", row));
    expect(link.origin + link.pathname).toBe("https://snapshelf.app/");
    expect(Object.fromEntries(link.searchParams)).toEqual({ ref: "x", utm_source: "launchingnext", utm_medium: "directory" });
  });

  it("submits to submit_url, or to the directory's url when it's blank", () => {
    expect(submitUrl(row)).toBe("https://www.launchingnext.com/submit/");
    expect(submitUrl({ ...row, submit_url: "" })).toBe("https://www.launchingnext.com/");
  });
});

describe("freeDirectoryRow", () => {
  const [row] = parseDirectories(`${HEADER}\n${GOOD_ROW}`);

  it("maps a row to the brief's columns, with nothing from notes but the check date and our submission", () => {
    expect(freeDirectoryRow(row)).toEqual({
      rank: 1,
      name: "Launching Next",
      url: "https://www.launchingnext.com/",
      type: "launch board",
      freeRoute: "Free listing, paid upgrades optional",
      queue: "about 1 day, reviewed",
      badge: "no",
      linkType: "not checked",
      submit: "https://www.launchingnext.com/submit/",
      lastVerified: "2026-11-16",
      ourSubmission: "submitted",
    });
  });

  it("says 'not stated' for an unknown wait or badge rule, and reads queued, live and skipped submissions", () => {
    const free = (patch: Partial<Directory>) => freeDirectoryRow({ ...row, ...patch });
    expect(free({ approval_time: "", badge_required: "unknown" })).toMatchObject({ queue: "not stated", badge: "not stated" });
    expect(free({ backlink_required: "yes" }).badge).toBe("yes");
    expect(free({ notes: "Our experience: booked for 23 Nov. checked 2026-11-16" }).ourSubmission).toBe("queued");
    expect(free({ notes: "Our experience: submitted 11 Nov as showcase, approved and live 12 Nov. checked 2026-11-16" }).ourSubmission).toBe("live");
    expect(free({ notes: "Our experience: skipped because workplace verification shows employer. checked 2026-11-16" }).ourSubmission).toBe("skipped");
    expect(free({ notes: "Our experience: a new account could not create posts yet. checked 2026-11-16" }).ourSubmission).toBe("");
    expect(free({ category: "software-reviews" }).type).toBe("review site");
    expect(free({ category: "startup-database" }).type).toBe("evergreen directory");
    expect(free({ pricing: "free" }).freeRoute).toBe("Free listing");
  });

  it("gives every free-page row a last-verified date", () => {
    expect(parseDirectories(shipped).slice(0, 20).map((r) => freeDirectoryRow(r).lastVerified)).not.toContain("");
  });
});

describe("directoriesCsv", () => {
  it("writes the header and every column, so the download parses back to the same rows", () => {
    const rows = parseDirectories(shipped);
    const csv = directoriesCsv(rows);
    expect(csv.split("\r\n")[0]).toBe(HEADER);
    expect(parseDirectories(csv)).toEqual(rows);
  });

  it("adds the buyer's link and copy as extra columns when there are some", () => {
    const [row] = parseDirectories(`${HEADER}\n${GOOD_ROW}`);
    const csv = directoriesCsv([row], () => ({ your_link: "https://snapshelf.app/?utm_source=launchingnext", tagline: 'Find any screenshot, "fast"', description: "Search, tag, share." }));
    const [header, line] = csv.split("\r\n");
    expect(header).toBe(`${HEADER},your_link,tagline,description`);
    expect(line.endsWith(',https://snapshelf.app/?utm_source=launchingnext,"Find any screenshot, ""fast""","Search, tag, share."')).toBe(true);
  });
});
