"use client";

import { useEffect } from "react";

// Registers the service worker in production only (localhost counts as a secure
// context, so `next start` works too). Disabled in `next dev` to avoid caching
// surprises while developing.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal */
      });
    }
  }, []);

  return null;
}
