"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// A click on a link that isn't prefetched yet produces NO visual change until
// the response arrives: React keeps the current page on screen for the whole
// transition, and a route's loading.tsx only appears once its payload starts
// streaming. On a weak connection that is a second or more of a page that
// looks completely inert — which reads as "the site froze and my tap didn't
// register", and gets tapped again.
//
// This is the missing acknowledgement: a thin bar that creeps across the top
// for as long as a navigation is in flight, for every internal link on the
// site rather than one wrapper component at a time.

// Instant (prefetched) navigations are the common case and must not flicker a
// bar on and off — only show up if the navigation is actually taking a moment.
const SHOW_AFTER_MS = 140;

// A click can always fail to navigate at all (an <a> whose handler bails, a
// download, a cross-document redirect). Never leave the bar running forever.
const SAFETY_MS = 20000;

export default function NavigationProgress() {
  const pathname = usePathname();
  // The path the pending navigation started FROM. Arriving anywhere else makes
  // the bar disappear by derivation — no effect watching the pathname, and so
  // no way for it to linger a frame into the new page.
  const [startedFrom, setStartedFrom] = useState<string | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      showTimer.current = null;
      safetyTimer.current = null;
    };

    const onClick = (event: MouseEvent) => {
      // Anything that isn't a plain left-click stays in the browser's hands:
      // modifier-clicks and middle-clicks open a new tab, they don't navigate.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || !anchor.href || anchor.target || anchor.hasAttribute("download")) return;
      if (anchor.origin !== window.location.origin) return;

      // A same-page link (or a bare #anchor) never loads anything.
      if (
        anchor.pathname === window.location.pathname &&
        anchor.search === window.location.search
      ) {
        return;
      }

      const from = window.location.pathname;
      clearTimers();
      showTimer.current = setTimeout(() => setStartedFrom(from), SHOW_AFTER_MS);
      safetyTimer.current = setTimeout(() => setStartedFrom(null), SAFETY_MS);
    };

    const onRestore = () => {
      clearTimers();
      setStartedFrom(null);
    };

    document.addEventListener("click", onClick, { capture: true });
    // Back/forward restores from the router cache and is effectively instant;
    // if one is already in flight, though, the arrival must still clear it.
    window.addEventListener("pageshow", onRestore);
    return () => {
      clearTimers();
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("pageshow", onRestore);
    };
  }, []);

  if (startedFrom === null || startedFrom !== pathname) return null;

  return <div className="nav-progress" role="presentation" aria-hidden />;
}
