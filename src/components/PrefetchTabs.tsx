"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { NavLinkItem } from "./DesktopNav";

/**
 * Warms the router cache for every header tab as soon as a page mounts.
 *
 * Two problems this solves, both of which showed up as "I clicked a tab and
 * nothing happened for a second or two":
 *
 * 1. On phones the desktop nav is `hidden sm:flex` — present in the DOM but
 *    `display:none` — so its links never intersect the viewport and Link's
 *    prefetch never fires for ANY tab. The mobile menu's own links only exist
 *    while the menu is open, which is too late to help the tap that opens it.
 *    Mobile visitors were paying a full round trip on every single tab.
 *
 * 2. Even on desktop, viewport prefetch is scheduled off idle callbacks and
 *    competes with everything else the page is fetching. A tab clicked before
 *    its turn came up costs a round trip during which React deliberately keeps
 *    the OLD page on screen — the route's loading.tsx skeleton arrives in the
 *    very payload being waited on, so not even a skeleton can paint.
 *
 * Prefetching here is what lets a click commit immediately: once the route tree
 * is cached the router knows where the loading boundary is, so it can show the
 * skeleton instantly and stream the content in behind it.
 *
 * Deliberately fired on every mount, not once per session — the router cache is
 * bounded by staleTimes (see next.config.ts) and these are cheap repeat calls
 * that no-op while an entry is still fresh.
 */
export default function PrefetchTabs({ links }: { links: readonly NavLinkItem[] }) {
  const router = useRouter();

  useEffect(() => {
    // Yield first: the page the visitor actually asked for should finish
    // fetching what it needs before we spend their connection on speculation.
    const schedule =
      "requestIdleCallback" in window
        ? (cb: () => void) =>
            (
              window as unknown as {
                requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number;
              }
            ).requestIdleCallback(cb, { timeout: 2000 })
        : (cb: () => void) => window.setTimeout(cb, 300);

    const handle = schedule(() => {
      for (const l of links) router.prefetch(l.href);
    });

    return () => {
      if ("cancelIdleCallback" in window) {
        (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(
          handle as number,
        );
      } else {
        clearTimeout(handle as number);
      }
    };
  }, [router, links]);

  return null;
}
