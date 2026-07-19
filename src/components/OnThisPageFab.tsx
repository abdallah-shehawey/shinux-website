"use client";

import { useState } from "react";
import type { TocItem } from "@/lib/markdown";
import { useActiveHeading } from "@/components/useActiveHeading";

function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function goTo(id: string, close: () => void) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" }); // respects scroll-margin-top: 5rem
    history.replaceState(null, "", `#${id}`);
  }
  close();
}

// Mobile-only ("On this page" hidden `lg:block` sidebar substitute): a
// floating pill showing the current section that opens a bottom sheet with
// the full TOC. Shares the same active-heading tracking as the desktop
// TableOfContents via useActiveHeading, so both agree on "current section".
export default function OnThisPageFab({
  items,
  isRtl,
  lang,
}: {
  items: TocItem[];
  isRtl: boolean;
  lang: string;
}) {
  const [open, setOpen] = useState(false);
  const activeId = useActiveHeading(items);

  if (items.length === 0) return null;

  const activeItem = items.find((item) => item.id === activeId);
  const activeText = activeItem?.text ?? "On this page";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="fixed z-30 flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-3 text-sm shadow-lg backdrop-blur lg:hidden"
        style={{
          // owner spec: bottom-start in Arabic (RTL⇒right), bottom-end in English (LTR⇒right)
          insetInlineStart: isRtl ? "1rem" : undefined,
          insetInlineEnd: isRtl ? undefined : "1rem",
          bottom: "calc(1rem + env(safe-area-inset-bottom))", // iOS safe area
          maxWidth: "min(70vw, 22rem)",
        }}
      >
        <ListIcon className="h-4 w-4 flex-none" />
        <span className="truncate">{activeText}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="On this page"
        >
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <nav
            dir={isRtl ? "rtl" : "ltr"}
            lang={lang}
            className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-border bg-bg p-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              On this page
            </p>
            <ul className="space-y-1 text-sm">
              {items.map((item) => (
                <li
                  key={item.id}
                  style={item.depth === 3 ? { paddingInlineStart: "1rem" } : undefined}
                >
                  <a
                    href={`#${item.id}`}
                    aria-current={item.id === activeId ? "location" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      goTo(item.id, () => setOpen(false));
                    }}
                    className={`block rounded-md px-3 py-2 ${
                      item.id === activeId
                        ? "border-s-2 border-accent bg-card font-medium text-accent"
                        : "text-muted"
                    }`}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
