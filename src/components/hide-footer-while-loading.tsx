"use client";

/**
 * Goes in a page's Suspense fallback. The skeleton is shorter than the page it stands in for, so a scroll while it's
 * up reveals the footer, which then jumps down when the content streams in (a layout shift). Hidden instead, the
 * footer first appears in its final place. The style leaves the DOM with the fallback, and is switched off if
 * Activity hides the page while it's still loading, so it can't hide the footer of the page shown instead.
 */
export function HideFooterWhileLoading() {
  return (
    <style
      ref={(style) => {
        if (style) style.media = "";
        return () => {
          if (style) style.media = "not all";
        };
      }}
    >
      {"[data-site-footer] { visibility: hidden; }"}
    </style>
  );
}
