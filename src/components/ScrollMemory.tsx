"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

import {
  flush,
  getScroll,
  resumeTracking,
  setScroll,
  suppressTracking,
  trackingSuppressed,
} from "@/lib/scroll-memory";

// How long to keep insisting on a restored position. It has to outlast
// everything that moves the page after a route commits: a loading boundary
// handing over to the real content, an image or a font settling, and Next's own
// scroll reset, which for a route it had to fetch lands *after* this effect.
// Short enough that it is over before the reader could wonder what happened,
// and any real input ends it early anyway.
const RESTORE_WINDOW_MS = 1200;

/**
 * Scroll to `target`, and keep insisting on it for a moment.
 *
 * A single `scrollTo` is not enough, in two different ways. The browser clamps
 * to the current document height, so anything that arrives after this frame
 * leaves the page parked above where it should be; and something else may scroll
 * the page back to the top later in the same navigation, which a one-shot call
 * has no answer to. So this re-applies the target every frame until the window
 * expires — but only ever downwards, so a reader who is already deeper into the
 * page than we were aiming for is left alone.
 *
 * Returns a cancel function. It also stops on its own when the window expires or
 * the reader scrolls, taps, or types: they always win.
 *
 * Recording is suppressed for the duration. While this is running the reader's
 * position *is* `target`, not the clamped value a page that has not finished
 * growing happens to be at — and a page that gets hidden or unloaded mid-restore
 * (the phone taking the tab away, a hard navigation) would otherwise persist that
 * clamped value and lose the real one.
 */
function restoreScroll(target: number): () => void {
  if (target <= 0) {
    window.scrollTo(0, 0);
    return () => {};
  }

  suppressTracking();
  window.scrollTo(0, target);

  let cancelled = false;
  let frame = 0;
  const deadline = performance.now() + RESTORE_WINDOW_MS;
  const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

  const stop = () => {
    cancelled = true;
    resumeTracking();
    if (frame !== 0) cancelAnimationFrame(frame);
    for (const type of inputs) window.removeEventListener(type, stop);
  };

  for (const type of inputs) window.addEventListener(type, stop, { passive: true });

  const tick = () => {
    if (cancelled) return;
    if (window.scrollY < target) window.scrollTo(0, target);
    if (performance.now() < deadline) frame = requestAnimationFrame(tick);
    else stop();
  };
  frame = requestAnimationFrame(tick);

  return stop;
}

/**
 * Whether two pathnames are the same page, whatever their encoding.
 *
 * `usePathname` and `location.pathname` agree on ASCII paths, but the site has
 * Arabic question slugs, and a percent-encoded path compared against a decoded
 * one would silently answer "different page".
 */
function samePath(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    return decodeURIComponent(a) === decodeURIComponent(b);
  } catch {
    return false;
  }
}

/**
 * How this document was reached, as the browser reports it.
 *
 * Only interesting on the first render: a document that was reloaded or arrived
 * through Back/Forward is a page the reader has already read part of, and should
 * open where they left it. A plain `navigate` is a fresh visit and belongs at
 * the top — or wherever its own fragment points.
 */
function initialNavigationType(): string {
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return entry?.type ?? "navigate";
}

/**
 * Invisible component that keeps the reader's place across navigations.
 *
 * Three parts:
 *
 * 1. **Recording.** Every scroll event stores the position under the current
 *    pathname, so it is up to date no matter how the page is left — a link, the
 *    Back button, a redirect, or the browser discarding the document. A save on
 *    the way out (`pagehide` / hidden) makes sure the last one reaches storage.
 * 2. **A snapshot on click**, in the capture phase, so the exact position is
 *    banked before the router — or the pending-navigation skeleton — moves the
 *    page.
 * 3. **Restoring**, in a layout effect on every pathname change and once on
 *    mount. A page we have a position for opens there; anything else opens at
 *    the top.
 *
 * Browser Back/Forward within one document is handled by the same restore path:
 * the browser's own restoration runs first, but it can only offer the offset the
 * history entry recorded — 0 whenever a skeleton had scrolled the page to the
 * top before the router committed the entry — so the position kept here is the
 * one that has to win.
 */
export default function ScrollMemory() {
  const pathname = usePathname();
  const firstRender = useRef(true);
  const cancelRestore = useRef<(() => void) | null>(null);
  // Set when the link being followed points at a fragment on another page: the
  // browser is about to scroll to that heading and must not be overruled.
  const skipNextRestore = useRef(false);
  // Where the reader was before they used the table of contents, so Back out of
  // the fragment can put them there. Held separately from the recorded position,
  // which by then describes the heading they jumped to.
  const beforeFragment = useRef<{ path: string; y: number } | null>(null);
  // The page a scroll event belongs to. It has to come from a ref written in the
  // layout effect below, not from this render's `pathname`, because the listener
  // is re-subscribed in a passive effect — which React can run *after* the
  // browser has already dispatched the scroll event for the router's own
  // scroll-to-top. Read from a stale closure, that reset gets filed as the
  // reader's position on the page they just left, and Back returns them to its
  // top. Measured, not theoretical.
  const trackedPath = useRef(pathname);

  // Record where the reader is, continuously.
  useEffect(() => {
    const record = () => {
      if (!trackingSuppressed()) setScroll(trackedPath.current, window.scrollY);
    };
    const persist = () => {
      record();
      flush();
    };
    const onVisibilityChange = () => {
      // The only reliable "this document may not get another event" signal on
      // mobile, where a backgrounded tab can be killed without an unload.
      if (document.visibilityState === "hidden") persist();
    };
    // Anything the reader does with the page they are still looking at means
    // they are reading it, not leaving it — so a suppressed skeleton scroll from
    // a navigation that never landed cannot keep tracking switched off.
    const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

    window.addEventListener("scroll", record, { passive: true });
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", onVisibilityChange);
    for (const type of inputs) {
      window.addEventListener(type, resumeTracking, { passive: true });
    }
    return () => {
      window.removeEventListener("scroll", record);
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      for (const type of inputs) window.removeEventListener(type, resumeTracking);
    };
  }, []);

  // Bank the position the instant a link is clicked. The capture phase
  // guarantees this runs before the navigation starts, before Next.js resets the
  // scroll for a `scroll={true}` link, and before the skeleton scrolls to the
  // top of the outgoing page.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a") : null;
      if (!anchor?.href || anchor.target) return;
      if (event.defaultPrevented) return;
      if (anchor.origin !== window.location.origin) return;

      setScroll(trackedPath.current, window.scrollY);

      if (!anchor.hash) return;
      if (!samePath(anchor.pathname, trackedPath.current)) {
        skipNextRestore.current = true;
      } else if (!window.location.hash) {
        // Stepping off the clean URL into the table of contents. Later jumps
        // between headings must not overwrite this: it is the one position Back
        // can no longer work out for itself.
        beforeFragment.current = { path: trackedPath.current, y: window.scrollY };
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  // Back out of a table-of-contents jump.
  //
  // Nothing else covers this: the pathname has not changed, so React does not
  // re-render and the layout effect below never sees it. The browser's own
  // restoration usually gets it right, but it is working from the offset the
  // history entry recorded, and on a slow connection the router can re-render the
  // page — resetting the scroll — after that has already happened.
  useEffect(() => {
    const onPopState = () => {
      const saved = beforeFragment.current;
      if (saved === null) return;
      // A hash in the URL is the browser's job, and a different page is the
      // layout effect's.
      if (window.location.hash) return;
      if (!samePath(window.location.pathname, saved.path)) return;

      beforeFragment.current = null;
      cancelRestore.current?.();
      cancelRestore.current = restoreScroll(saved.y);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Restore on arrival.
  useLayoutEffect(() => {
    // Before anything else, and in a layout effect on purpose: from this point
    // in the commit on, scroll events belong to the new page. See trackedPath.
    const arrived = trackedPath.current !== pathname;
    trackedPath.current = pathname;

    // A restore still insisting on the page we just left would spend its
    // remaining frames scrolling this one.
    cancelRestore.current?.();
    cancelRestore.current = null;

    const first = firstRender.current;
    firstRender.current = false;
    if (!first && !arrived) return;

    // Whatever the skeleton suppressed is over: this is a different page now.
    resumeTracking();

    if (skipNextRestore.current) {
      skipNextRestore.current = false;
      return;
    }

    // A fragment in the URL is the reader's own instruction about where to land.
    // Comparing pathnames first because `location` still describes the previous
    // page during a pushed navigation — Next.js updates history in a passive
    // effect, after this one — while on Back/Forward and on mount it is current,
    // which is exactly when a fragment can be there without a click.
    if (window.location.hash && samePath(window.location.pathname, pathname)) return;

    if (first) {
      const type = initialNavigationType();
      if (type !== "reload" && type !== "back_forward") return;
      // Back onto a document the phone discarded, or a plain reload. The browser
      // may have restored something already; restoreScroll only ever adds to it.
    }

    const saved = getScroll(pathname);
    if (saved === null) {
      // Never seen: start at the top. Not redundant with the router's own reset
      // — the header tabs and the "← All tutorials" links are all `scroll=false`
      // and would otherwise keep the outgoing page's offset.
      if (!first) window.scrollTo(0, 0);
      return;
    }

    cancelRestore.current = restoreScroll(saved);
  }, [pathname]);

  return null;
}
