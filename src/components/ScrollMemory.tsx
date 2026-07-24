"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

// Module-level maps survive across component re-renders and re-mounts.
// They persist for the lifetime of the browser tab (SPA session).
const scrollPositions = new Map<string, number>();
const visitedPaths = new Set<string>();

// How long to keep insisting on a restored position while the page is still
// growing under us. Long enough to cover an auth round trip (the admin's
// "Reorder" toolbar appears with the session and pushes the grid down), short
// enough never to fight a visitor who has started scrolling.
const RESTORE_WINDOW_MS = 1200;

/**
 * Scroll to `target`, and keep re-applying it while the document is still too
 * short to reach it.
 *
 * A single scrollTo is not enough: the browser clamps to the current document
 * height, so anything that arrives after this frame — a late client-only
 * section, images, a font swap — leaves the page parked above where it should
 * be. Returns a cancel function; it stops on its own as soon as the position
 * sticks, the window expires, or the visitor scrolls for themselves.
 */
function restoreScroll(target: number): () => void {
  window.scrollTo(0, target);
  if (window.scrollY >= target) return () => {};

  let cancelled = false;
  let frame = 0;
  const deadline = performance.now() + RESTORE_WINDOW_MS;

  const stop = () => {
    cancelled = true;
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
  };

  // The visitor always wins.
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);

  const tick = () => {
    if (cancelled) return;
    if (window.scrollY < target) window.scrollTo(0, target);
    if (window.scrollY < target && performance.now() < deadline) {
      frame = requestAnimationFrame(tick);
    } else {
      stop();
    }
  };
  frame = requestAnimationFrame(tick);

  return stop;
}

/**
 * Invisible component that saves and restores scroll positions per pathname.
 *
 * How it works:
 * 1. A document-level click handler (capture phase) saves window.scrollY for
 *    the current pathname the INSTANT any <a> is clicked — before Next.js
 *    starts its navigation and potentially scrolls to top.
 * 2. When the pathname changes, if the new page was previously visited its
 *    saved scroll position is restored. If it's a first visit, scroll goes
 *    to the top.
 *
 * This covers every navigation pattern:
 * - Header tab links (scroll={false})  → save on click, restore on arrival
 * - Back links like ← All tutorials    → save on click, restore on arrival
 * - Content cards (default scroll=true) → save on click, new page starts at 0
 * - Browser back/forward               → Next.js handles natively with staleTimes
 */
export default function ScrollMemory() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const mounted = useRef(false);

  // Save scroll position the moment ANY internal link is clicked.
  // Using capture phase guarantees this fires BEFORE the navigation starts
  // and before Next.js's scroll={true} resets window.scrollY to 0.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      // Only save for internal navigation links (same-origin, no target)
      if (
        anchor.href &&
        !anchor.target &&
        !e.defaultPrevented &&
        anchor.origin === window.location.origin
      ) {
        scrollPositions.set(pathname, window.scrollY);
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () =>
      document.removeEventListener("click", handleClick, { capture: true });
  }, [pathname]);

  // Restore scroll position when the pathname changes.
  useLayoutEffect(() => {
    // On very first mount, just mark the initial path as visited.
    if (!mounted.current) {
      mounted.current = true;
      visitedPaths.add(pathname);
      return;
    }

    const oldPath = prevPath.current;
    if (oldPath === pathname) return;
    prevPath.current = pathname;

    // Restore scroll for the page we're entering.
    if (visitedPaths.has(pathname)) {
      const saved = scrollPositions.get(pathname);
      if (saved != null) {
        visitedPaths.add(pathname);
        // Cancelled if we navigate away again before the position settles —
        // otherwise the retry loop would scroll whatever page came next.
        return restoreScroll(saved);
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
