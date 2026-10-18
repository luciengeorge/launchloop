import { NodeType, type Node } from "node-html-parser";

/**
 * A node's text with a space between text nodes. node-html-parser's `.text` joins them directly,
 * so `<a>Get the kit, £19</a><h3>3. Ship Loop</h3>` reads as "£193. Ship Loop".
 */
export function spacedText(node: Node): string {
  const parts: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === NodeType.TEXT_NODE) parts.push(n.text);
    else n.childNodes.forEach(walk);
  };
  walk(node);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
