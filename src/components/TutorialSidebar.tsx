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
              className={`flex items-center justify-between rounded-md px-2.5 py-2 transition-all active:scale-[0.98] ${
                active
                  ? "border-s-2 border-accent bg-accent/10 font-semibold text-fg shadow-xs"
                  : "text-muted hover:bg-card hover:text-fg"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={`font-mono text-xs ${active ? "text-accent font-bold" : "text-muted"}`}>
                  {i + 1}.
                </span>
                <span className="truncate">{l.title}</span>
              </span>
              {active && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" aria-hidden="true" />
              )}
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
    <nav ref={navRef} aria-label="Lessons in this track" className="card reader-rail flex flex-col overflow-hidden">
      <p className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">Lessons</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {list}
      </div>
    </nav>
  );
}
