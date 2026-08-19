"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { forgetScroll } from "@/lib/scroll-memory";

/**
 * The site name in the header, as a "start over" link rather than a seventh tab.
 *
 * The Home tab beside it is a way *back* to a page you were reading, so
 * ScrollMemory returns you to where you left it — land in the middle of the home
 * page and that is working as designed. But the brand is the one control that
 * means "take me to the front of the site", and being dropped halfway down it
 * reads as the click having half-failed. So it always lands at the very top:
 *
 * - From another page, by forgetting the stored home position, which is what
 *   ScrollMemory consults on arrival; with nothing to restore it scrolls to 0.
 * - From the home page itself, where there is no navigation to hang that on, by
 *   scrolling there directly. Smoothly, because the page under it does not
 *   change and an instant jump would look like a different page had loaded.
 */
export default function BrandLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Anything the browser won't turn into an in-page navigation — a
    // modifier-click opening a new tab, a middle click — keeps its own meaning.
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    forgetScroll(href);

    if (window.location.pathname !== href) return;

    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
