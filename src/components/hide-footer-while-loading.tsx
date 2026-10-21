/**
 * Goes in a page's Suspense fallback. The skeleton is shorter than the page it stands in for, so a scroll while it's
 * up reveals the footer, which then jumps down when the content streams in (a layout shift). Hidden instead, the
 * footer first appears in its final place. The style leaves the DOM with the fallback. Leaving a page mid-load keeps
 * it in the DOM under a hidden Activity (display: none), where React can render the fallback again without running
 * refs or effects, so the rule only applies while a copy of this <style> sits outside every display: none subtree.
 */
export function HideFooterWhileLoading() {
  return (
    <style data-hide-footer="">
      {'body:has(style[data-hide-footer]:not([style*="display: none"], [style*="display: none"] *)) [data-site-footer] { visibility: hidden; }'}
    </style>
  );
}
