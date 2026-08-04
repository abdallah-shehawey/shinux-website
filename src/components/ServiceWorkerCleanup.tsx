"use client";

import { useEffect } from "react";

// Removes any service worker this site registered in the past, and the caches
// it left behind.
//
// The site has no service worker any more: no offline mode, no precaching, no
// update banner. Requests go straight to the network. This component exists
// only to clean up after the old one — it registers nothing.
//
// Two paths lead out, and both are needed. public/sw.js is now a tombstone
// worker that unregisters itself, which catches browsers that re-check the
// script on their own schedule. This runs in the page instead, so a visitor
// whose browser has not re-checked yet is still freed on their very next
// visit. Whichever gets there first, the result is the same.
//
// Safe to delete once the old worker cannot plausibly still be installed
// anywhere — same lifetime as public/sw.js.
export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      })
      .catch(() => {
        /* nothing registered, or the browser refused — either way, done */
      });

    // The caches outlive the registration, so they have to go separately or
    // they just sit in the user's storage quota forever.
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {});
    }
  }, []);

  return null;
}
