"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Reads a query param on the client without a Suspense boundary; null during server render. */
export function useQueryParam(name: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}
