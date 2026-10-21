import { describe, expect, it } from "vitest";
import { GITHUB_PREFIX, looksLikeGitHubUrl, replacesPrefix, repoPrefill, sameInput } from "@/lib/repo-cta";

describe("repoPrefill", () => {
  it("starts from github.com/ when the host says nothing about the repo", () => {
    for (const input of ["https://tool4boxology.service.tib.eu", "my-app.vercel.app/", "https://example.com/github.io", "not a url", ""]) {
      expect(repoPrefill(input)).toEqual({ value: GITHUB_PREFIX, prefill: "github" });
    }
  });

  it("names the repo behind a GitHub Pages address", () => {
    expect(repoPrefill("https://acme.github.io/rocket/docs/")).toEqual({ value: "https://github.com/acme/rocket", prefill: "github_pages" });
    expect(repoPrefill("Acme.GitHub.io")).toEqual({ value: "https://github.com/acme/acme.github.io", prefill: "github_pages" });
  });

  it("a file at the root of a GitHub Pages site is the user/org site repo, not a repo named after the file", () => {
    for (const input of ["https://acme.github.io/index.html", "acme.github.io/about.htm", "https://acme.github.io/Index.HTML?x=1"]) {
      expect(repoPrefill(input)).toEqual({ value: "https://github.com/acme/acme.github.io", prefill: "github_pages" });
    }
    // A file inside a project site still names the project.
    expect(repoPrefill("https://acme.github.io/rocket/index.html")).toEqual({ value: "https://github.com/acme/rocket", prefill: "github_pages" });
  });

  it("project repos named like files are projects, not root pages", () => {
    const cases = [
      ["https://necolas.github.io/normalize.css/", "https://github.com/necolas/normalize.css"],
      ["https://user.github.io/reveal.js/", "https://github.com/user/reveal.js"],
      ["user.github.io/chart.js", "https://github.com/user/chart.js"],
      // Only a lone .html/.htm segment without a trailing slash is a root page.
      ["https://user.github.io/index.html", "https://github.com/user/user.github.io"],
      ["https://user.github.io/index.html/", "https://github.com/user/index.html"],
    ];
    for (const [input, value] of cases) expect(repoPrefill(input)).toEqual({ value, prefill: "github_pages" });
  });
});

describe("sameInput", () => {
  it("treats the scheme, the host's case, whitespace and trailing slashes as the same link", () => {
    expect(sameInput("https://tool4boxology.service.tib.eu", " tool4boxology.service.tib.eu/ ")).toBe(true);
    expect(sameInput("HTTP://Example.com//", "example.com")).toBe(true);
    expect(sameInput("https://A.com/App", "a.com/App/")).toBe(true);
  });

  it("keeps the path's case: a.com/App and a.com/app can be different pages", () => {
    expect(sameInput("a.com/App", "a.com/app")).toBe(false);
    expect(sameInput("https://A.COM/Docs?Tab=1", "a.com/Docs?tab=1")).toBe(false);
  });

  it("any other change is a new link", () => {
    expect(sameInput("example.com", "example.com/pricing")).toBe(false);
    expect(sameInput("example.com", "github.com/acme/example")).toBe(false);
  });
});

describe("looksLikeGitHubUrl", () => {
  it("GitHub links, and the prefill on the way there, keep repo mode", () => {
    for (const input of ["https://github.com/", "github.com/acme/app", "https://www.github.com/acme", "https://github.co", "github"]) {
      expect(looksLikeGitHubUrl(input)).toBe(true);
    }
  });

  it("typing www.github.com/... or http://github.com/... keeps repo mode at every step", () => {
    for (const target of ["www.github.com/acme", "http://github.com/acme", "http://www.github.com/acme", "https://www.github.com/acme"]) {
      for (let i = 1; i <= target.length; i++) expect(looksLikeGitHubUrl(target.slice(0, i)), target.slice(0, i)).toBe(true);
    }
  });

  it("an empty input or any other site ends it", () => {
    for (const input of ["", "  ", "https://acme.io", "acme.github.io", "notgithub.com/acme/app", "https://github.com.evil.io/x"]) {
      expect(looksLikeGitHubUrl(input)).toBe(false);
    }
  });
});

describe("replacesPrefix", () => {
  it("a whole link pasted onto the bare prefix replaces it", () => {
    expect(replacesPrefix(GITHUB_PREFIX, "https://github.com/SDM-TIB/Tool4Boxology")).toBe(true);
    expect(replacesPrefix(GITHUB_PREFIX, " github.com/acme/app\n")).toBe(true);
  });

  it("an owner/repo paste, or a paste into anything but the bare prefix, is left alone", () => {
    expect(replacesPrefix(GITHUB_PREFIX, "SDM-TIB/Tool4Boxology")).toBe(false);
    expect(replacesPrefix("https://github.com/acme", "https://github.com/acme/app")).toBe(false);
  });
});
