"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { LessonMeta } from "@/lib/tutorials";

// Left-hand lesson nav for a track — the mkdocs-style "jump to any sibling
// lesson without going back to the track hub" list. Same lessons array
// getTrack() already returns, just rendered as a nav instead of a grid.
// Desktop gets a sticky card; below `lg` it collapses into a <details>
// disclosure above the article body (see globals.css/AboutPage for the same
// disclosure pattern), so jumping between lessons isn't desktop-only.
//
// Converted to a client component so we can auto-scroll the active lesson
// into view on mount (keeps it visible inside the scrollable sidebar).
export default function TutorialSidebar({
  track,
  lessons,
  currentSlug,
  collapsedOnMobile = false,
}: {
  track: string;
  lessons: LessonMeta[];
  currentSlug: string;
  collapsedOnMobile?: boolean;
}) {
  const navRef = useRef<HTMLElement>(null);

  // On mount, scroll the active lesson link into view within the sidebar.
  useEffect(() => {
    if (!navRef.current) return;
    const activeEl = navRef.current.querySelector<HTMLElement>(`a[aria-current="page"]`);
    activeEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentSlug]);

  if (lessons.length === 0) return null;

  const list = (
    <ul className="space-y-1 text-sm">
      {lessons.map((l, i) => {
        const active = l.slug === currentSlug;
        return (
          <li key={l.slug}>
            <Link
              href={`/tutorials/${track}/${l.slug}`}
              aria-current={active ? "page" : undefined}
              className={`block rounded-md px-2 py-1.5 transition-colors hover:bg-card ${
                active
                  ? "border-s-2 border-accent bg-card font-medium text-accent"
                  : "text-muted"
              }`}
            >
              <span className="font-mono text-xs text-muted">{i + 1}.</span> {l.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (collapsedOnMobile) {
    const currentIndex = lessons.findIndex((l) => l.slug === currentSlug);
    return (
      <details className="card">
        <summary className="cursor-pointer select-none text-sm font-semibold text-fg">
          {currentIndex === -1 ? "All lessons" : `Lesson ${currentIndex + 1} of ${lessons.length}`}{" "}
          <span className="text-muted">&darr;</span>
        </summary>
        <div className="mt-3">{list}</div>
      </details>
    );
  }

  return (
    <nav ref={navRef} aria-label="Lessons in this track" className="card">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Lessons</p>
      {list}
    </nav>
  );
}
