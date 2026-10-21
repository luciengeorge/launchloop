import { describe, expect, it } from "vitest";
import { GITHUB_PREFIX, replacesPrefix, repoPrefill, sameInput } from "@/lib/repo-cta";

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
});

describe("sameInput", () => {
  it("treats case, the scheme, whitespace and trailing slashes as the same link", () => {
    expect(sameInput("https://tool4boxology.service.tib.eu", " tool4boxology.service.tib.eu/ ")).toBe(true);
    expect(sameInput("HTTP://Example.com//", "example.com")).toBe(true);
  });

  it("any other change is a new link", () => {
    expect(sameInput("example.com", "example.com/pricing")).toBe(false);
    expect(sameInput("example.com", "github.com/acme/example")).toBe(false);
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
