"use client";

import { useEffect } from "react";
import { captureClientException } from "@/lib/sentry-client";
import { reportClientError } from "@/lib/client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureClientException(error);
    reportClientError(error);
  }, [error]);
  return (
    <html lang="en-GB">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1>LaunchLoop hit an unexpected error</h1>
          <p>We&apos;ve logged it. Please try again.</p>
          <button onClick={reset} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
