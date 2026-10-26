import { Children, Fragment, cloneElement, isValidElement, type ReactNode } from "react";

/** Top-level children with fragments opened up, so `<>...</>` around a post body still exposes its h2s. Keys stay unique. */
function flatten(children: ReactNode, prefix = ""): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [child];
    if (child.type === Fragment) return flatten(child.props.children, `${prefix}${child.key}`);
    return [prefix ? cloneElement(child, { key: `${prefix}${child.key}` }) : child];
  });
}

/**
 * A post's body with `node` before its first top-level <h2>, so a block lands right after the intro of every post,
 * including new ones. No top-level h2: after the first child. No children: nothing is added.
 */
export function insertBeforeFirstH2(children: ReactNode, node: ReactNode): ReactNode[] {
  const items = flatten(children);
  if (items.length === 0) return items;
  const h2 = items.findIndex((child) => isValidElement(child) && child.type === "h2");
  items.splice(h2 === -1 ? 1 : h2, 0, node);
  return items;
}
