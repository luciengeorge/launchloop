import { reportClientError } from "./lib/client";

window.addEventListener("error", (event) => {
  if (event.error instanceof Error) reportClientError(event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  reportClientError(reason instanceof Error ? reason : new Error(String(reason)));
});
