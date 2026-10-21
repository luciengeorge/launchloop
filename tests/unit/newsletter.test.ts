import { describe, expect, it } from "vitest";
import { newsletterErrorAnchor, newsletterReturnPath, parsePlacement, PREVIEW_NEWSLETTER_ANCHOR } from "@/lib/newsletter";

describe("parsePlacement", () => {
  it.each(["footer", "preview", "blog"] as const)("keeps %s", (placement) => {
    expect(parsePlacement(placement)).toBe(placement);
  });

  it.each([undefined, null, "", "Blog", "blog ", "guide", "kit", 1, ["blog"], { placement: "blog" }])("turns %j into footer", (value) => {
    expect(parsePlacement(value)).toBe("footer");
  });
});

describe("newsletterReturnPath for the blog signup", () => {
  const post = "/blog/how-to-launch-on-product-hunt";

  it("comes back to the post's signup block on success", () => {
    expect(PREVIEW_NEWSLETTER_ANCHOR).toBe("newsletter");
    expect(newsletterReturnPath(post, "blog", { ok: true, welcome: "sent" })).toBe(`${post}?subscribed=1&from=blog#newsletter`);
    expect(newsletterReturnPath(post, "blog", { ok: true, welcome: "existing" })).toBe(`${post}?subscribed=1&welcome=existing&from=blog#newsletter`);
    expect(newsletterReturnPath(post, "blog", { ok: true, welcome: "skipped" })).toBe(`${post}?subscribed=1&welcome=skipped&from=blog#newsletter`);
  });

  it.each(["invalid", "reserved", "rate", "server"] as const)("points a %s error at the blog form's own message", (error) => {
    expect(newsletterErrorAnchor("blog", error)).toBe(`newsletter-blog-${error}`);
    expect(newsletterReturnPath(post, "blog", { ok: false, error })).toBe(`${post}?subscribed=0&error=${error}&from=blog#newsletter-blog-${error}`);
  });

  it("drops the post's query and hash, and never leaves the site", () => {
    expect(newsletterReturnPath(`${post}?subscribed=0&from=footer#x`, "blog", { ok: true, welcome: "sent" })).toBe(`${post}?subscribed=1&from=blog#newsletter`);
    for (const next of ["//evil.com", "/.//evil.com", "/\\evil.com", "https://evil.com/blog/x", undefined]) {
      expect(newsletterReturnPath(next, "blog", { ok: true, welcome: "sent" })).toBe("/?subscribed=1&from=blog#newsletter");
    }
  });

  it("leaves the footer and post-preview paths as they were", () => {
    expect(newsletterReturnPath("/pricing", "footer", { ok: true, welcome: "sent" })).toBe("/pricing?subscribed=1");
    expect(newsletterReturnPath("/kit/abc", "preview", { ok: true, welcome: "sent" })).toBe("/kit/abc?subscribed=1&from=preview#newsletter");
  });
});
