export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export function reportClientError(error: Error & { digest?: string }) {
  try {
    const payload = JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest, url: window.location.href });
    if (!navigator.sendBeacon?.("/api/log", new Blob([payload], { type: "application/json" }))) {
      void fetch("/api/log", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // Reporting must never throw inside an error handler.
  }
}

export type KitStreamEvent =
  | { type: "step"; step: string }
  | { type: "done"; id: string; url: string }
  | { type: "error"; status: number; error: string };

/** POST /api/kits with live progress. Falls back to the plain JSON response if streaming isn't available. */
export async function createKitWithProgress(input: string, onStep: (step: string) => void): Promise<{ url: string }> {
  const res = await fetch("/api/kits", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson, application/json" },
    body: JSON.stringify({ url: input }),
  });
  if (!res.headers.get("content-type")?.includes("application/x-ndjson") || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error ?? `Request failed (${res.status})`);
    return { url: data.url };
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += value;
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      if (!line.trim()) continue;
      let event: KitStreamEvent;
      try {
        event = JSON.parse(line) as KitStreamEvent;
      } catch {
        continue;
      }
      if (event.type === "step") onStep(event.step);
      else if (event.type === "done") return { url: event.url };
      else if (event.type === "error") throw new Error(event.error);
    }
    if (done) throw new Error("The connection dropped before your preview was ready. Please try again.");
  }
}
