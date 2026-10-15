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
