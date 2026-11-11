import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LINKEDIN_EXAMPLES } from "@/lib/linkedin-launch-examples";
import { BLOG_POSTS, post } from "@/lib/blog";

const root = path.join(import.meta.dirname, "../..");
const read = (file: string) => existsSync(path.join(root, file)) ? readFileSync(path.join(root, file), "utf8") : "";
const route = "src/app/blog/linkedin-product-launch-post/page.tsx";
const log = "docs/seo/2026-11-11-linkedin-product-launch-post.md";

describe("LinkedIn product launch post", () => {
  it("registers the page once with its publication date", () => {
    expect(post("linkedin-product-launch-post")).toMatchObject({ published: "2026-11-11", updated: "2026-11-11" });
    expect(BLOG_POSTS.filter((p) => p.slug === "linkedin-product-launch-post")).toHaveLength(1);
  });

  it("uses shared metadata, layout, FAQ and copy buttons", () => {
    const source = read(route);
    for (const pattern of ["blogPageMetadata(postPage(p))", "<BlogPostLayout post={p}>", "<Faq items={FAQ}", "<CopyButton", "LINKEDIN_TEMPLATE", "LINKEDIN_EXAMPLES"]) expect(source).toContain(pattern);
  });

  it("dates first-party LinkedIn sources without asserting reach or a fixed truncation threshold", () => {
    const source = read(route);
    for (const id of ["a528176", "a525301", "a521928", "a6233775"]) expect(source).toContain(id);
    expect(source).toContain("as of 11 November 2026");
    expect(source).not.toMatch(/(?:140|210) characters|links? (?:reduce|hurt) reach|best time to post/i);
  });

  it("logs original examples honestly, with frozen inputs rather than invented launch outcomes", () => {
    const source = read(log);
    expect(source).toContain("Original element:");
    expect(source).toContain("not LaunchLoop kit outputs");
    for (const repo of ["emilkowalski/sonner", "pmndrs/zustand", "ai/nanoid"]) expect(source).toContain(repo);
    expect(source).toContain("Array.from(text.trim()).length");
  });

  it("adds a contextual inbound link from the OG guide", () => {
    expect(read("src/app/blog/og-image-size/page.tsx")).toContain('slug: "linkedin-product-launch-post"');
  });

  it("keeps each displayed count reproducible and below the sourced ceiling", () => {
    expect(LINKEDIN_EXAMPLES).toHaveLength(3);
    for (const example of LINKEDIN_EXAMPLES) {
      expect(example.sha).toMatch(/^[a-f0-9]{40}$/);
      expect(Array.from(example.text).every((c) => c.codePointAt(0)! <= 127)).toBe(true);
      const count = Array.from(example.text.trim()).length;
      expect(count).toBeLessThanOrEqual(3000);
      expect(read(log)).toContain(`| ${example.name} | ${count} | Below |`);
    }
  });

  it("keeps prohibited punctuation, percentages and private data out of the new copy", () => {
    for (const file of [route, log, "src/lib/linkedin-launch-examples.ts"]) {
      expect(read(file), file).not.toMatch(/[\u2013\u2014]|\d\s?%|@gmail\.com|launchloop\.dev\/kit\//i);
    }
  });
});
