import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueOneBody } from "@/components/newsletter-issue-1";
import { issuePath, NEWSLETTER_ISSUES, newsletterIssue } from "@/lib/newsletter-issues";
import { issuePage, NEWSLETTER_PAGE } from "@/lib/pages";
import { SITE } from "@/lib/site";

/** newsletter-draft-2026-10-26.md exactly as Lucien locked it on 27 Oct 2026. Never edit the fixture to make this pass. */
const LOCKED = readFileSync(path.join(import.meta.dirname, "fixtures/newsletter-draft-2026-10-26.md"), "utf8");
const DASHES = /[\u2012-\u2015]/;

type Block = { tag: "p" | "h2" | "li"; text: string };
type Anchor = { text: string; href: string };

const squash = (text: string) => text.replace(/\s+/g, " ").trim();
const sitePath = (href: string) => href.replace(/^https:\/\/launchloop\.dev(?=\/|$)/, "") || "/";

/** The markdown section after `## <name>`, up to the next heading or rule. */
const section = (name: string) => LOCKED.split(`## ${name}\n`)[1].split(/\n(?:## |---)/)[0].trim();

/** The body Lucien locked: from "Hey, Lucien here." to the sign-off, as blocks of plain text plus every link in it. */
function lockedBody(): { blocks: Block[]; anchors: Anchor[] } {
  const body = LOCKED.slice(LOCKED.indexOf("Hey, Lucien here.")).trim();
  const anchors: Anchor[] = [];
  const inline = (md: string) => {
    const text = md
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
        anchors.push({ text: label.replace(/\*\*/g, ""), href: sitePath(href) });
        return label;
      })
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1");
    for (const url of text.match(/https?:\/\/[^\s)]+/g) ?? []) anchors.push({ text: url, href: sitePath(url) });
    return squash(text);
  };
  const blocks = body.split(/\n\s*\n/).flatMap((chunk): Block[] => {
    if (chunk.startsWith("## ")) return [{ tag: "h2", text: inline(chunk.slice(3)) }];
    if (chunk.startsWith("- ")) return chunk.split("\n").map((line) => ({ tag: "li", text: inline(line.slice(2)) }));
    return [{ tag: "p", text: inline(chunk) }];
  });
  return { blocks, anchors };
}

function renderedBody(): { blocks: Block[]; anchors: Anchor[]; text: string } {
  const root = parse(renderToStaticMarkup(createElement(IssueOneBody)));
  return {
    blocks: root.querySelectorAll("p, h2, li").map((el) => ({ tag: el.tagName.toLowerCase() as Block["tag"], text: squash(el.text) })),
    anchors: root.querySelectorAll("a").map((a) => ({ text: squash(a.text), href: a.getAttribute("href")! })),
    text: squash(root.text),
  };
}

describe("issue 1 matches the locked draft", () => {
  it("block for block, word for word", () => {
    const locked = lockedBody();
    const rendered = renderedBody();
    expect(rendered.blocks).toEqual(locked.blocks);
    expect(locked.blocks[0]).toEqual({ tag: "p", text: "Hey, Lucien here." });
    expect(locked.blocks.at(-1)).toEqual({ tag: "p", text: "Lucien" });
  });

  it("with the same links, in the same order (launchloop.dev links as site paths)", () => {
    const { anchors } = lockedBody();
    expect(renderedBody().anchors).toEqual(anchors);
    expect(anchors).toHaveLength(12);
  });

  it("has the five BetaList checks, the share card section and its 1200x630 line", () => {
    const { text } = renderedBody();
    for (const check of ["1. It's paid now.", "2. Use your own domain.", "3. Write one plain sentence.", "4. Be ready on any day.", "5. Keep expectations small."]) {
      expect(text).toContain(check);
    }
    expect(text).toContain("When someone shares your site, the card comes from your og:image. Make it 1200x630.");
    expect(text).toContain("Set twitter:card to summary_large_image, or X may show the small card.");
  });

  it("shows nothing of the draft's status and has no dashes", () => {
    const { text } = renderedBody();
    expect(text).not.toMatch(/draft|held|not sent|approval|scheduled/i);
    expect(text).not.toMatch(DASHES);
  });
});

describe("the issue registry", () => {
  it("issue 1's subject and preview are the locked subject line and preview text", () => {
    const issue = newsletterIssue(1);
    expect(issue.subject).toBe(section("Subject line"));
    expect(issue.preview).toBe(section("Preview text"));
    expect(issue.subject).toBe("Before you submit to BetaList, check these 5 things");
    expect(issue).toMatchObject({ published: "2026-10-27", updated: "2026-10-27" });
  });

  it("issue 1's meta title is the short one, sized for the suffix; the h1 keeps the full subject", () => {
    const page = issuePage(newsletterIssue(1));
    expect(page.title).toBe("Before you submit to BetaList: 5 checks");
    const full = `${page.title} · ${SITE.name}`;
    expect(full.length).toBeGreaterThanOrEqual(50);
    expect(full.length).toBeLessThanOrEqual(59);
    expect(page).toMatchObject({ path: "/newsletter/1", description: newsletterIssue(1).preview, type: "article", image: { url: "/og/newsletter-1" } });
  });

  it("every issue has a numbered path under /newsletter and the index is sized for the suffix", () => {
    expect(NEWSLETTER_ISSUES.map(issuePath)).toEqual(["/newsletter/1"]);
    expect(NEWSLETTER_PAGE).toMatchObject({ path: "/newsletter", title: "Weekly launch teardowns: sample issues", image: { url: "/og/newsletter" } });
    expect(`${NEWSLETTER_PAGE.title} · ${SITE.name}`.length).toBeLessThanOrEqual(59);
    expect(NEWSLETTER_PAGE.description.length).toBeGreaterThanOrEqual(138);
    expect(NEWSLETTER_PAGE.description.length).toBeLessThanOrEqual(158);
    expect(`${NEWSLETTER_PAGE.title} ${NEWSLETTER_PAGE.description}`).not.toMatch(DASHES);
  });
});
