"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

// Module-level maps survive across component re-renders and re-mounts.
// They persist for the lifetime of the browser tab (SPA session).
const scrollPositions = new Map<string, number>();
const visitedPaths = new Set<string>();

/**
 * Invisible component that saves and restores scroll positions per pathname.
 *
 * How it works:
 * 1. Navigation links that should preserve scroll (header nav tabs, back links)
 *    use `scroll={false}` so Next.js does NOT scroll to top.
 * 2. When the pathname changes, this component saves `window.scrollY` for the
 *    old pathname (still accurate because `scroll={false}` didn't reset it).
 * 3. If the new pathname was previously visited, it restores the saved position.
 *    If it's a first visit, it scrolls to top (needed because `scroll={false}`
 *    would otherwise leave the page at the old page's scroll position).
 *
 * Regular content links (cards, lesson links, etc.) keep the default
 * `scroll={true}` and are unaffected — they scroll to top as usual.
 */
export default function ScrollMemory() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    // On very first mount, just mark the initial path as visited.
    if (!mounted.current) {
      mounted.current = true;
      visitedPaths.add(pathname);
      return;
    }

    const oldPath = prevPath.current;
    if (oldPath === pathname) return;

    // Save scroll position for the page we're leaving.
    // Because nav/back links use scroll={false}, window.scrollY still holds
    // the genuine scroll position of the old page at this point.
    scrollPositions.set(oldPath, window.scrollY);
    prevPath.current = pathname;

    // Restore scroll for the page we're entering.
    if (visitedPaths.has(pathname)) {
      const saved = scrollPositions.get(pathname);
      if (saved != null) {
        window.scrollTo(0, saved);
      }
    } else {
      // First visit — scroll to top (scroll={false} links would otherwise
      // leave us at the old page's scroll position).
      window.scrollTo(0, 0);
    }

    visitedPaths.add(pathname);
  }, [pathname]);

  return null;
}
