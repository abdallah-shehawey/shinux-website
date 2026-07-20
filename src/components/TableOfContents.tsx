"use client";

import { useEffect, useRef } from "react";
import type { TocItem } from "@/lib/markdown";
import { useActiveHeading } from "@/components/useActiveHeading";

// Generic table-of-contents renderer — takes plain TocItem[] as props, no
// coupling to how the Markdown was sourced (spec §12: reusable pieces).
// `dir`/`lang` apply only to the heading list, since those items come from
// the article's own content language while the "On this page" label stays
// in the site's (English) UI language.
//
// Includes a scroll-spy (IntersectionObserver) that highlights whichever
// heading is currently visible in the viewport, plus a left accent rail
// matching the Lessons sidebar active-link style.
export default function TableOfContents({
  items,
  title,
  dir = "ltr",
  lang = "en",
}: {
  items: TocItem[];
  title: string;
  dir?: "ltr" | "rtl";
  lang?: string;
}) {
  const activeId = useActiveHeading(items);
  const navRef = useRef<HTMLElement>(null);

  // Auto-scroll the sidebar so the active link stays visible.
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const activeEl = navRef.current.querySelector<HTMLElement>(`a[aria-current="location"]`);
    activeEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  if (items.length === 0) return null;

  return (
    <nav ref={navRef} aria-label={title} className="card flex h-full flex-col overflow-hidden">
      <p className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="space-y-1 text-sm" dir={dir} lang={lang}>
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id} style={item.depth === 3 ? { paddingInlineStart: "1rem" } : undefined}>
                <a
                  href={`#${item.id}`}
                  aria-current={active ? "location" : undefined}
                  className={`block rounded-md px-2 py-1 transition-colors hover:bg-card ${
                    active
                      ? "border-s-2 border-accent bg-card font-medium text-accent"
                      : "text-muted"
                  }`}
                >
                  {item.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
