import { createElement, Fragment, isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { insertBeforeFirstH2 } from "@/lib/blog-inline";

const el = (type: string, text: string) => createElement(type, null, text);
const block = createElement("aside", { key: "inline-newsletter" }, "signup");

/** Each item as "type:text", the inserted block as "BLOCK". */
const shape = (items: ReactNode[]) =>
  items.map((item) => {
    if (item === block) return "BLOCK";
    if (!isValidElement<{ children?: ReactNode }>(item)) return String(item);
    return `${String(item.type)}:${String(item.props.children)}`;
  });

describe("insertBeforeFirstH2", () => {
  it("goes right before the first top-level h2, after the intro paragraphs", () => {
    const out = insertBeforeFirstH2([el("p", "one"), el("p", "two"), el("h2", "first"), el("p", "three"), el("h2", "second")], block);
    expect(shape(out)).toEqual(["p:one", "p:two", "BLOCK", "h2:first", "p:three", "h2:second"]);
  });

  it("an h2 nested inside another element doesn't count as top-level", () => {
    const out = insertBeforeFirstH2([el("p", "intro"), createElement("section", null, el("h2", "nested")), el("h2", "top")], block);
    expect(shape(out)).toEqual(["p:intro", "section:[object Object]", "BLOCK", "h2:top"]);
  });

  it("with no top-level h2, goes after the first child", () => {
    expect(shape(insertBeforeFirstH2([el("p", "one"), el("p", "two")], block))).toEqual(["p:one", "BLOCK", "p:two"]);
    expect(shape(insertBeforeFirstH2(el("p", "only"), block))).toEqual(["p:only", "BLOCK"]);
  });

  it("looks inside fragments, and keeps every key unique", () => {
    const body = createElement(Fragment, null, el("p", "one"), createElement(Fragment, null, el("p", "two"), el("h2", "first")), el("p", "three"));
    const out = insertBeforeFirstH2([body, el("p", "after")], block);
    expect(shape(out)).toEqual(["p:one", "p:two", "BLOCK", "h2:first", "p:three", "p:after"]);
    const keys = out.map((item) => (isValidElement(item) ? item.key : null));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("an h2 at the very start puts the block first", () => {
    expect(shape(insertBeforeFirstH2([el("h2", "first"), el("p", "one")], block))).toEqual(["BLOCK", "h2:first", "p:one"]);
  });

  it("with no children, adds nothing", () => {
    for (const empty of [null, undefined, [], false, createElement(Fragment)]) expect(insertBeforeFirstH2(empty, block)).toEqual([]);
  });
});
