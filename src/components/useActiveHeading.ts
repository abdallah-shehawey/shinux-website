"use client";

import { useEffect, useState } from "react";

// Tracks which heading is currently visible in the viewport via a single
// shared IntersectionObserver, so the desktop TOC sidebar and the mobile
// "On this page" FAB (which render the exact same items) don't each run
// their own observer over the same headings.
export function useActiveHeading(items: { id: string }[]) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting);
        if (vis.length) setActiveId(vis[0].target.id);
      },
      // Top inset skips the sticky chrome (see --reader-top) so a heading
      // scrolled up behind the header stops counting as the active one.
      // rootMargin takes px/% only, hence the literal rather than the var.
      { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  return activeId;
}
