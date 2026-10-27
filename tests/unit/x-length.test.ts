import { parseTweet, regexen } from "twitter-text";
import { describe, expect, it } from "vitest";
import { LIMITS, fitToLimit } from "@/lib/limits";
import { xLength } from "@/lib/x-length";
import { X_TLDS } from "@/lib/x-tlds";

/** twitter-text is X's reference counter; it is a dev dependency only, so the browser bundle doesn't ship it or its core-js@2 polyfills. */
const reference = (text: string) => parseTweet(text).weightedLength;

const tlds = (re: RegExp) => re.source.match(/^\(\?:\(\?:(.*)\)\(\?=/)![1].split("|");

describe("xLength", () => {
  it("uses the same TLD list as twitter-text", () => {
    expect(X_TLDS).toEqual([...tlds(regexen.validGTLD), ...tlds(regexen.validCCTLD)]);
  });

  it("counts a bare domain as a 23-character link, the way X does", () => {
    expect(xLength("launchloop.dev")).toBe(23);
    expect(xLength("Try launchloop.dev today")).toBe(33);
    expect(xLength("launchloop.dev/pricing")).toBe(23);
    expect(xLength("www.example.com/path?x=1")).toBe(23);
    expect(xLength("See LaunchLoop.Dev and example.co.uk")).toBe(4 + 23 + 5 + 23);
  });

  it("still counts http(s) links as 23", () => {
    expect(xLength("https://launchloop.dev")).toBe(23);
    expect(xLength("Read https://launchloop.dev/blog/how-to-launch-on-product-hunt now")).toBe(5 + 23 + 4);
  });

  it("leaves text that X doesn't link at its plain length", () => {
    for (const text of ["Node.js and Next.js", "e.g. this", "@launchloop.dev", "#launchloop.dev", "user@launchloop.dev", "foo.test", "v1.2.3", "launchloop dot dev"]) {
      expect(xLength(text), text).toBe(Array.from(text).length);
    }
  });

  const corpus = [
    "launchloop.dev",
    "Built with Next.js, live at launchloop.dev. Feedback welcome!",
    "Two links: launchloop.dev and https://github.com/acme/app (both 23).",
    "see README.md for setup",
    "launchloop.dev/pricing. Then launchloop.dev/faq, then (launchloop.dev).",
    "a.b.c.d.example.io:8080/x and example.com:3000",
    "https://t.co/abc123/extra",
    "https://example.com/wiki/Foo_(bar) and https://example.com/a?b=c&d=e.",
    "münchen.de is a link, 例子.中国 is not one without https",
    "Café crème at café.fr: déjà vu",
    "日本語のテキスト launchloop.dev 中文",
    "Price: £14, launch on 26 Oct. ‘Quotes’ “and” dashes – fine…",
    "-launchloop.dev _launchloop.dev /launchloop.dev .launchloop.dev",
    "xn--bcher-kva.example and xn--bcher-kva.com",
    "bit.ly/abc goo.gl/xyz",
    "The Product Hunt tagline is 60 characters, the description 260. Ship it at launchloop.dev/tools/product-hunt-tagline-checker today.",
  ];

  it("matches twitter-text's weighted length", () => {
    for (const text of corpus) expect(xLength(text), text).toBe(reference(text));
  });

  it("fits an X post with a bare domain within 280 as X counts it", () => {
    const post = `${"Shipping a small launch tool for indie makers. ".repeat(5)}Try it at launchloop.dev and tell me what breaks. ${"More words here. ".repeat(4)}`;
    const fitted = fitToLimit(post, LIMITS.xPost, xLength);
    expect(xLength(fitted)).toBeLessThanOrEqual(LIMITS.xPost);
    expect(reference(fitted)).toBeLessThanOrEqual(LIMITS.xPost);
  });
});
