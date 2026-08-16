"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * How long a pointer has to rest on a link before we believe it. A mouse
 * crossing a grid of cards on its way somewhere else passes over each one in
 * well under this; someone reading a card's title is already past it.
 */
const DWELL_MS = 80;

/**
 * Warms the route behind a link as soon as the reader shows they want it —
 * hovering it, touching it, or tabbing to it — but not before.
 *
 * The card grids all opt out of Link's viewport prefetch (see ArticleCard):
 * /articles renders every article at once and each card costs four RSC segment
 * requests the moment it scrolls into view, which is speculative traffic the
 * page the reader actually asked for has to queue behind. Turning that off
 * fixed the cost but left the other extreme — `prefetch={false}` means no
 * prefetch at all, hover included, so **every** card click was a full cold
 * round trip, measured at 0.7–2.2s of skeleton on production before the article
 * appeared. The skeleton was honest; the wait was the bug.
 *
 * Intent is the middle ground: one route, only once the reader has singled it
 * out, so a click lands on a warm cache and usually shows no skeleton at all.
 * Delegated from the document rather than wired into each card, because the
 * cards are server components and this way it covers every link on the site.
 */
export default function PrefetchOnIntent() {
  const router = useRouter();

  useEffect(() => {
    // Someone on a metered or slow connection did not ask for speculation.
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && /^(slow-)?2g$/.test(connection.effectiveType)) return;

    const warmed = new Set<string>();
    let timer: number | null = null;

    const cancel = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    /** The route this event points at, or null if it isn't worth warming. */
    const routeFor = (target: EventTarget | null): string | null => {
      const anchor = target instanceof Element ? target.closest("a") : null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return null;
      // Covers hrefless anchors, mailto:, and everything off-site at once.
      if (anchor.origin !== window.location.origin) return null;

      const to = anchor.pathname + anchor.search;
      // An in-page fragment, or a query the page handles for itself.
      if (anchor.pathname === window.location.pathname) return null;
      if (warmed.has(to)) return null;
      return to;
    };

    const warm = (to: string) => {
      warmed.add(to);
      router.prefetch(to);
    };

    const onHover = (event: PointerEvent) => {
      // Touch reaches us through touchstart below, where a tap and a scroll can
      // still be told apart; a synthesised hover cannot.
      if (event.pointerType === "touch") return;
      const to = routeFor(event.target);
      cancel();
      if (to === null) return;
      timer = window.setTimeout(() => warm(to), DWELL_MS);
    };

    const onTouchStart = (event: TouchEvent) => {
      const to = routeFor(event.target);
      cancel();
      if (to === null) return;
      // A finger on a card is as likely to be the start of a scroll as a tap,
      // so wait for it to stay put — touchmove below calls that off.
      timer = window.setTimeout(() => warm(to), DWELL_MS);
    };

    // Tabbing through gets the same treatment, without the dwell: keyboard
    // focus is deliberate by definition.
    const onFocus = (event: FocusEvent) => {
      const to = routeFor(event.target);
      if (to !== null) warm(to);
    };

    document.addEventListener("pointerover", onHover, { passive: true });
    document.addEventListener("pointerout", cancel, { passive: true });
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", cancel, { passive: true });
    document.addEventListener("focusin", onFocus, { passive: true });

    return () => {
      document.removeEventListener("pointerover", onHover);
      document.removeEventListener("pointerout", cancel);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", cancel);
      document.removeEventListener("focusin", onFocus);
      cancel();
    };
  }, [router]);

  return null;
}
