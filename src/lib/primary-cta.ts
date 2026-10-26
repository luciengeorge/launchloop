import { useEffect, useSyncExternalStore } from "react";

/**
 * Text for a filled orange button that must pass WCAG AA (4.5:1): white on --primary is only about 3.6:1, the foreground
 * colour about 5.4:1, and more on the lighter hover. Used by the newsletter forms and the hero kit form; the brand
 * orange itself is unchanged.
 */
export const ON_PRIMARY_TEXT = "text-foreground";

/** Whether some mounted component (the kit unlock panel) is the page's one primary call to action. */
let claims = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useClaimPrimaryCta() {
  useEffect(() => {
    claims += 1;
    emit();
    return () => {
      claims -= 1;
      emit();
    };
  }, []);
}

/** False during server render; other primary buttons (the footer's) step down to outline while it's true. */
export function usePrimaryCtaClaimed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => claims > 0,
    () => false,
  );
}
