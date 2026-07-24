"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Multi-select tag filter: a "Filter" button next to the search box that
// opens a checkbox list. Checking several tags in a row must NOT close the
// panel — only an outside click, Escape, or the toggle button itself does —
// so several tags can be picked in one sitting. Each toggle applies live via
// router.replace (not push): replace edits the current history entry in
// place instead of adding one, so rapid checkbox clicks don't spam browser
// history with an undo step per tag.
export default function TagFilterDropdown({
  tags,
  selectedTags,
  q,
  basePath,
}: {
  tags: string[];
  selectedTags: string[];
  q?: string;
  basePath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pushSelection(next: string[]) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (next.length > 0) params.set("tags", next.join(","));
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  function toggle(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    pushSelection(next);
  }

  function clearAll() {
    pushSelection([]);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost"
        data-active={selectedTags.length > 0}
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="me-1.5"
        >
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filter
        {selectedTags.length > 0 && (
          <span className="ms-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-fg/20 px-1 text-[10px] font-bold">
            {selectedTags.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Filter by tag"
          className="dropdown-panel absolute start-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-2 shadow-lg"
        >
          <div className="flex items-center justify-between px-1 py-1">
            <p className="text-sm font-semibold text-fg">Filter by tag</p>
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-accent hover:underline active:opacity-70"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="mt-1 flex max-h-72 flex-col overflow-y-auto">
            {tags.map((tg) => {
              const isOn = selectedTags.includes(tg);
              return (
                <label
                  key={tg}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-fg transition hover:bg-bg"
                >
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggle(tg)}
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  <span className="truncate font-mono text-[0.8rem]">{tg}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
