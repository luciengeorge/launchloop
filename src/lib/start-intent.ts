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

/** Starts kit checkout for an existing kit. Returns false if the kit is gone so callers can fall back to the form. */
export async function checkoutKit(kitId: string): Promise<boolean> {
  const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: "kit", kitId }) });
  const data = (await res.json().catch(() => ({}))) as { url?: string };
  if (!res.ok || !data.url) return false;
  window.location.assign(data.url);
  return true;
}
