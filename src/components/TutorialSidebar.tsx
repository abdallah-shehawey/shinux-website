"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LessonMeta } from "@/lib/tutorials";

type HoveredState = {
  title: string;
  index: number;
  rect: { top: number; bottom: number; left: number; right: number; width: number };
} | null;

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
  const [hovered, setHovered] = useState<HoveredState>(null);

  // On mount, scroll the active lesson link into view within the sidebar.
  useEffect(() => {
    if (!navRef.current) return;
    const activeEl = navRef.current.querySelector<HTMLElement>(`a[aria-current="page"]`);
    activeEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentSlug]);

  // Hide tooltip when scrolling
  useEffect(() => {
    const handleScroll = () => setHovered(null);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHovered({ title: l.title, index: i + 1, rect });
              }}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center justify-between rounded-md px-2.5 py-2 transition-all active:scale-[0.98] ${
                active
                  ? "border-s-2 border-accent bg-accent/10 font-semibold text-accent shadow-xs"
                  : "text-muted hover:bg-accent/10 hover:text-accent"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={`font-mono text-xs ${active ? "text-accent font-bold" : "text-muted"}`}>
                  {i + 1}.
                </span>
                <span className="truncate">{l.title}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const tooltipElement = hovered && (
    <div
      style={{
        position: "fixed",
        top: `${hovered.rect.bottom + 6}px`,
        left: `${Math.max(12, Math.min(hovered.rect.left, window.innerWidth - 310))}px`,
        zIndex: 9999,
      }}
      className="pointer-events-none max-w-xs animate-in fade-in-0 zoom-in-95 rounded-lg border border-border bg-card/95 p-3 text-xs shadow-xl backdrop-blur-md transition-all duration-150"
    >
      <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
        Lesson {hovered.index}
      </div>
      <div className="font-medium leading-relaxed text-fg">
        {hovered.title}
      </div>
    </div>
  );

  if (collapsedOnMobile) {
    const currentIndex = lessons.findIndex((l) => l.slug === currentSlug);
    return (
      <>
        <details className="card">
          <summary className="cursor-pointer select-none text-sm font-semibold text-fg">
            {currentIndex === -1 ? "All lessons" : `Lesson ${currentIndex + 1} of ${lessons.length}`}{" "}
            <span className="text-muted">&darr;</span>
          </summary>
          <div className="mt-3">{list}</div>
        </details>
        {tooltipElement}
      </>
    );
  }

  return (
    <>
      <nav ref={navRef} aria-label="Lessons in this track" className="card reader-rail flex flex-col overflow-hidden">
        <p className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">Lessons</p>
        <div className="min-h-0 flex-1 overflow-y-auto" onScroll={() => setHovered(null)}>
          {list}
        </div>
      </nav>
      {tooltipElement}
    </>
  );
}

