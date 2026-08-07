"use client";

import { useRef, useState } from "react";
import { useDismissOnOutsideOrBack } from "@/hooks/useDismissOnOutsideOrBack";

export interface ThreadMenuItem {
  label: string;
  onSelect: () => void;
  /** "danger" paints the item red — Delete. */
  tone?: "danger";
}

/**
 * The "⋯" menu on a question, an answer or a reply. Edit and Delete used to be
 * plain words in the byline, which made every post read as a row of controls
 * with a name in it; tucking them behind one button leaves the byline saying
 * who wrote it and when, and nothing else.
 *
 * Rendered only when there is something in it — the caller passes an empty
 * list for a visitor who owns neither.
 */
export default function ThreadMenu({
  items,
  label = "More options",
}: {
  items: ThreadMenuItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dismiss = useDismissOnOutsideOrBack(open, () => setOpen(false), ref);

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => (open ? dismiss() : setOpen(true))}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-card hover:text-fg active:scale-90"
        data-active={open}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="dropdown-panel absolute end-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                dismiss();
                item.onSelect();
              }}
              className={`block w-full rounded-lg px-3 py-2 text-start text-sm font-medium transition hover:bg-bg ${
                item.tone === "danger" ? "text-red-400" : "text-fg"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
