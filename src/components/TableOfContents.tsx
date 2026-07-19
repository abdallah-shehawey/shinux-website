"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/markdown";

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
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) return;

    const headingEls = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (headingEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the first entry that is intersecting — that gives us the
        // topmost visible heading which is the natural "current" section.
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0.1 },
    );

    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label={title} className="card">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
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
    </nav>
  );
}
