import { isTestVisit, track, type WaitlistEventContext } from "./analytics";
import { WAITLIST_ERROR_MESSAGES, waitlistErrorReason, type WaitlistErrorReason, type WaitlistResponse, type WaitlistSource } from "./waitlist";

/** Where a waitlist ask is shown: the surface, and the kit when it's on a kit's page. */
export interface WaitlistSurface {
  source: WaitlistSource;
  kitId?: string;
}

/** Properties for every waitlist event. QA is read when the event is sent, so it matches the page's other events. */
export function waitlistContext({ source, kitId }: WaitlistSurface): WaitlistEventContext {
  return { signup_source: source, ...(kitId ? { kitId } : {}), ...(isTestVisit() ? { is_test: true as const } : {}) };
}

export type WaitlistResult = { ok: true; duplicate: boolean } | { ok: false; status: number; reason: WaitlistErrorReason; message: string };

/**
 * POSTs /api/waitlist. waitlist_signup goes out only once the server has answered 2xx; any other answer, or none,
 * sends waitlist_error with the status and a reason derived from it. The email is never in either event.
 */
export async function joinWaitlist(email: string, surface: WaitlistSurface, fetcher: typeof fetch = fetch): Promise<WaitlistResult> {
  let res: Response;
  try {
    res = await fetcher("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, source: surface.source }) });
  } catch {
    return failed(0, surface);
  }
  const data = (await res.json().catch(() => ({}))) as Partial<WaitlistResponse> & { error?: unknown };
  // Only our JSON's own message: a plain-text 500 or a gateway's HTML page gets the friendly copy, never "Request failed".
  if (!res.ok) return failed(res.status, surface, typeof data.error === "string" && data.error.trim() ? data.error : undefined);
  const duplicate = data.duplicate === true;
  track("waitlist_signup", { ...waitlistContext(surface), duplicate });
  return { ok: true, duplicate };
}

function failed(status: number, surface: WaitlistSurface, serverMessage?: string): WaitlistResult {
  const reason = waitlistErrorReason(status);
  track("waitlist_error", { ...waitlistContext(surface), status, reason });
  return { ok: false, status, reason, message: serverMessage ?? WAITLIST_ERROR_MESSAGES[reason] };
}

/**
 * Calls `onView` the first time an observed element is at least half on screen, and never again for this tracker,
 * however many times `observe` runs (StrictMode mounts effects twice). Without IntersectionObserver it counts as seen.
 */
export function createViewOnce(onView: () => void) {
  let seen = false;
  const fire = () => {
    if (seen) return;
    seen = true;
    onView();
  };
  return {
    observe(el: Element | null): () => void {
      if (seen || !el) return () => {};
      if (typeof IntersectionObserver === "undefined") {
        fire();
        return () => {};
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          fire();
        },
        { threshold: 0.5 },
      );
      observer.observe(el);
      return () => observer.disconnect();
    },
  };
}

/** waitlist_cta_viewed for one mounted ask (see createViewOnce). */
export const waitlistViewTracker = (surface: WaitlistSurface) => createViewOnce(() => track("waitlist_cta_viewed", waitlistContext(surface)));
