import { describe, expect, it, vi } from "vitest";
import { isQaReferer } from "@/lib/attribution";
import type { DeployEnv } from "@/lib/deploy-env";
import { evaluateFlag } from "@/lib/launch-promo";
import {
  isResendTestAddress,
  NEWSLETTER_PLACEMENTS,
  newsletterErrorAnchor,
  newsletterReturnPath,
  parsePlacement,
  PREVIEW_NEWSLETTER_ANCHOR,
  resolveInlineFlag,
} from "@/lib/newsletter";

describe("parsePlacement", () => {
  it("knows all five placements", () => {
    expect(NEWSLETTER_PLACEMENTS).toEqual(["footer", "preview", "blog", "blog_inline", "home_inline"]);
  });

  it.each(NEWSLETTER_PLACEMENTS)("keeps %s", (placement) => {
    expect(parsePlacement(placement)).toBe(placement);
  });

  it.each([undefined, null, "", "Blog", "blog ", "guide", "kit", "blog-inline", "Home_inline", "home", "inline", 1, ["blog"], { placement: "blog" }])("turns %j into footer", (value) => {
    expect(parsePlacement(value)).toBe("footer");
  });
});

describe("newsletterReturnPath for the inline signups", () => {
  const post = "/blog/how-to-launch-on-product-hunt";

  it("comes back to the inline block (the page's #newsletter) on success", () => {
    expect(newsletterReturnPath(post, "blog_inline", { ok: true, welcome: "sent" })).toBe(`${post}?subscribed=1&from=blog_inline#newsletter`);
    expect(newsletterReturnPath(post, "blog_inline", { ok: true, welcome: "existing" })).toBe(`${post}?subscribed=1&welcome=existing&from=blog_inline#newsletter`);
    expect(newsletterReturnPath("/", "home_inline", { ok: true, welcome: "sent" })).toBe("/?subscribed=1&from=home_inline#newsletter");
    expect(newsletterReturnPath("/", "home_inline", { ok: true, welcome: "skipped" })).toBe("/?subscribed=1&welcome=skipped&from=home_inline#newsletter");
  });

  it.each(["invalid", "reserved", "rate", "server"] as const)("points a %s error at the inline form's own message", (error) => {
    expect(newsletterReturnPath(post, "blog_inline", { ok: false, error })).toBe(`${post}?subscribed=0&error=${error}&from=blog_inline#newsletter-blog_inline-${error}`);
    expect(newsletterReturnPath("/", "home_inline", { ok: false, error })).toBe(`/?subscribed=0&error=${error}&from=home_inline#newsletter-home_inline-${error}`);
  });
});

describe("resolveInlineFlag (newsletter-inline-signup)", () => {
  const ENVS: DeployEnv[] = ["production", "preview", "development"];
  const run = (override: string | undefined, env: DeployEnv, value: unknown) => {
    const flag = vi.fn(async () => value);
    return { result: resolveInlineFlag({ override, env, flag }), flag };
  };

  it.each(ENVS)("only a flag value of exactly true is on (%s, no override)", async (env) => {
    expect(await run(undefined, env, true).result).toBe(true);
    for (const value of [false, undefined, null, "true", "on", "control", "treatment", 1, {}]) expect(await run(undefined, env, value).result, String(value)).toBe(false);
    expect(await run("", env, true).result).toBe(true);
  });

  it.each(ENVS)("NEWSLETTER_INLINE=off is off without asking PostHog (%s)", async (env) => {
    for (const override of ["off", "OFF", " off "]) {
      const { result, flag } = run(override, env, true);
      expect(await result).toBe(false);
      expect(flag).not.toHaveBeenCalled();
    }
  });

  it("NEWSLETTER_INLINE=on forces it on outside production only, and there it doesn't ask PostHog", async () => {
    for (const env of ["preview", "development"] as const) {
      const { result, flag } = run("on", env, false);
      expect(await result).toBe(true);
      expect(flag).not.toHaveBeenCalled();
    }
    expect(await run("on", "production", false).result).toBe(false);
    expect(await run("on", "production", true).result).toBe(true);
  });

  it("an unknown override is ignored", async () => {
    expect(await run("yes", "development", false).result).toBe(false);
    expect(await run("1", "development", true).result).toBe(true);
  });

  it("a PostHog error or a timeout is off, and the error is reported", async () => {
    const onError = vi.fn();
    const failing = () => evaluateFlag(async () => Promise.reject(new Error("flags down")), { onError });
    expect(await resolveInlineFlag({ override: undefined, env: "production", flag: failing })).toBe(false);
    expect(onError).toHaveBeenCalledOnce();
    const hanging = () => evaluateFlag(() => new Promise(() => {}), { timeoutMs: 20 });
    expect(await resolveInlineFlag({ override: undefined, env: "production", flag: hanging })).toBe(false);
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

describe("QA signals a signup carries without JavaScript", () => {
  const post = (referer: string | undefined, headers: Record<string, string> = {}, url = "https://launchloop.dev/api/newsletter") =>
    new Request(url, { method: "POST", headers: { ...(referer ? { referer } : {}), ...headers } });

  it("a same-origin Referer tagged ?qa=1 or utm_source=qa is QA, like a QA landing", () => {
    expect(isQaReferer(post("https://launchloop.dev/blog/how-to-launch-on-product-hunt?qa=1"))).toBe(true);
    expect(isQaReferer(post("https://launchloop.dev/?utm_source=QA&utm_medium=x"))).toBe(true);
    expect(isQaReferer(post("https://launchloop.dev/kit/abc?subscribed=0&qa=1#newsletter"))).toBe(true);
  });

  it("anything else is not: no Referer, an untagged page, qa=0, or another site's page", () => {
    expect(isQaReferer(post(undefined))).toBe(false);
    expect(isQaReferer(post("https://launchloop.dev/blog/how-to-launch-on-product-hunt"))).toBe(false);
    expect(isQaReferer(post("https://launchloop.dev/?qa=0"))).toBe(false);
    expect(isQaReferer(post("https://launchloop.dev/?utm_source=quality"))).toBe(false);
    expect(isQaReferer(post("https://evil.example/?qa=1"))).toBe(false);
    expect(isQaReferer(post("https://launchloop.dev.evil.example/?qa=1"))).toBe(false);
    expect(isQaReferer(post("not a url ?qa=1"))).toBe(false);
  });

  it("matches the host the platform reports, when the request URL carries an internal one", () => {
    const internal = "http://localhost:3000/api/newsletter";
    expect(isQaReferer(post("https://launchloop-git-x.vercel.app/?qa=1", { host: "launchloop-git-x.vercel.app" }, internal))).toBe(true);
    expect(isQaReferer(post("https://launchloop.dev/?qa=1", { "x-forwarded-host": "launchloop.dev, proxy.internal" }, internal))).toBe(true);
    expect(isQaReferer(post("https://launchloop.dev/?qa=1", { host: "other.dev" }, internal))).toBe(false);
  });

  it("Resend's test sink is QA, in any case, and nothing else is", () => {
    for (const email of ["delivered@resend.dev", "bounced+run-7@resend.dev", "Delivered@Resend.DEV", "x@eu.resend.dev"]) expect(isResendTestAddress(email), email).toBe(true);
    for (const email of ["maker@launchloop.dev", "resend.dev@gmail.com", "x@resend.dev.example.com", "x@notresend.dev"]) expect(isResendTestAddress(email), email).toBe(false);
  });
});
