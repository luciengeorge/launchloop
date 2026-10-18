"use client";

import dynamic from "next/dynamic";

/**
 * sonner isn't needed to paint any page, so it loads after hydration. Toasts raised before it mounts (a flash
 * message on load) still show: sonner replays active toasts to a Toaster that subscribes late.
 */
export const LazyToaster = dynamic(() => import("@/components/ui/sonner").then((m) => m.Toaster), { ssr: false });
