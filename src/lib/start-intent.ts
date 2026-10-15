"use client";

export type StartPlan = "free" | "kit";
export const START_EVENT = "launchloop:start";
export const LAST_KIT_KEY = "launchloop:lastKitId";

export function rememberKit(id: string) {
  try {
    localStorage.setItem(LAST_KIT_KEY, id);
  } catch {
    // Storage can be blocked; the flow still works without it.
  }
}

export function lastKitId(): string | null {
  try {
    return localStorage.getItem(LAST_KIT_KEY);
  } catch {
    return null;
  }
}

/** Path that starts the unlock flow (sign in, then checkout) for an existing kit, or null if the kit is gone. */
export async function unlockPath(kitId: string): Promise<string | null> {
  const res = await fetch(`/api/kits/${kitId}/status`, { cache: "no-store" }).catch(() => null);
  return res?.ok ? `/kit/${kitId}?unlock=1` : null;
}
