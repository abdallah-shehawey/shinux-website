"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
 *    its turn came up costs a round trip during which the router keeps the OLD
 *    page on screen — the route's loading.tsx skeleton arrives in the very
 *    payload being waited on, so it cannot paint from here.
 *
 * A warm cache is what lets a click commit immediately, with the real content
 * and no skeleton at all. NavigationSkeleton covers the miss: it paints the
 * destination's skeleton straight away rather than letting the outgoing page
 * sit there. Both are wanted — this one makes navigations fast, that one makes
 * them honest when they aren't.
 *
 * Re-warmed after every navigation, not just on mount: the header lives in the
 * root layout, so it mounts once per full page load and would otherwise never
 * re-run — leaving a long session browsing on entries that have aged past
 * staleTimes (see next.config.ts). Repeat calls are cheap and no-op while an
 * entry is still fresh.
 */
export default function PrefetchTabs({ links }: { links: readonly NavLinkItem[] }) {
  const router = useRouter();
  const pathname = usePathname();

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
      // Skip the page we are already on — nothing to navigate to there.
      for (const l of links) if (l.href !== pathname) router.prefetch(l.href);
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
  }, [router, links, pathname]);

  return null;
}
