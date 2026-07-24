"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  // Only history entries the browser itself creates (back/forward) need to be
  // observed. The listing pages rewrite the URL with replaceState, which fires
  // nothing — deliberately, since in that direction the component's own state
  // is already the source of truth.
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

/**
 * The current query string — "" while prerendering, the real one in the
 * browser.
 *
 * The listing pages are statically prerendered, so they cannot be handed their
 * `?q=` / `?tags=` by the server. Reading window.location during render would
 * make the first client render disagree with the prerendered HTML; reading it
 * in an effect means a setState on mount. useSyncExternalStore is the pattern
 * built for exactly this: hydration matches the server ("" — no filters), and
 * React re-renders with the real URL immediately afterwards.
 */
export function useUrlQuery(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
}
