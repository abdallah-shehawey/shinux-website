"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface DragReorderListProps<T> {
  initialItems: T[];
  getId: (item: T) => string;
  /** Normal (non-reordering) display — a full grid/list of cards. */
  renderNormal: (items: T[]) => React.ReactNode;
  /** The same card used in renderNormal, rendered draggable while reordering. */
  renderCard: (item: T) => React.ReactNode;
  /** Grid container classes, shared between the normal and reordering views. */
  gridClassName: string;
  /** Table + column the position upsert writes to, e.g. "article_order" / "slug". */
  table: string;
  idColumn: string;
  /** Called after the order is saved successfully (e.g. to bust server caches). */
  onPersisted?: () => void;
}

// Distance from the top/bottom of the *viewport* (not the grid) that triggers
// auto-scroll while dragging, and the fastest scroll speed right at the edge.
const AUTO_SCROLL_EDGE = 120;
const AUTO_SCROLL_MAX_SPEED = 18;

// Native HTML5 drag-and-drop — no extra dependency. Admin-only in practice
// (the toggle button is only ever rendered when the caller knows the viewer
// is an admin), but RLS is still what actually enforces the write on the
// server, same as every other admin mutation in this app.
export default function DragReorderList<T>({
  initialItems,
  getId,
  renderNormal,
  renderCard,
  gridClassName,
  table,
  idColumn,
  onPersisted,
}: DragReorderListProps<T>) {
  const [items, setItems] = useState(initialItems);
  const [reordering, setReordering] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const scrollSpeedRef = useRef(0);

  // Auto-scroll the page while a card is dragged near the top/bottom edge of
  // the viewport — a reorderable grid is routinely taller than the screen.
  useEffect(() => {
    if (!reordering) return;

    function onWindowDragOver(e: DragEvent) {
      const y = e.clientY;
      if (y < AUTO_SCROLL_EDGE) {
        scrollSpeedRef.current = -AUTO_SCROLL_MAX_SPEED * (1 - y / AUTO_SCROLL_EDGE);
      } else if (y > window.innerHeight - AUTO_SCROLL_EDGE) {
        scrollSpeedRef.current =
          AUTO_SCROLL_MAX_SPEED * (1 - (window.innerHeight - y) / AUTO_SCROLL_EDGE);
      } else {
        scrollSpeedRef.current = 0;
      }
    }
    function stopScrolling() {
      scrollSpeedRef.current = 0;
    }

    let raf = requestAnimationFrame(function tick() {
      if (scrollSpeedRef.current) window.scrollBy(0, scrollSpeedRef.current);
      raf = requestAnimationFrame(tick);
    });

    window.addEventListener("dragover", onWindowDragOver);
    window.addEventListener("dragend", stopScrolling);
    window.addEventListener("drop", stopScrolling);
    return () => {
      window.removeEventListener("dragover", onWindowDragOver);
      window.removeEventListener("dragend", stopScrolling);
      window.removeEventListener("drop", stopScrolling);
      cancelAnimationFrame(raf);
      scrollSpeedRef.current = 0;
    };
  }, [reordering]);

  async function persist(next: T[]) {
    setSaving(true);
    setErrorMessage("");
    const supabase = createClient();
    const { error } = await supabase
      .from(table)
      .upsert(next.map((item, i) => ({ [idColumn]: getId(item), position: i })));
    setSaving(false);
    if (error) setErrorMessage(error.message);
    else onPersisted?.();
  }

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setItems(next);
    setDragIndex(null);
    persist(next);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => setReordering((v) => !v)} className="btn-ghost">
          {reordering ? "Done reordering" : "Reorder"}
        </button>
        {reordering && (
          <p className="text-xs text-muted">
            {saving
              ? "Saving…"
              : "Drag cards to set the order everyone sees. Drag near the top/bottom edge to scroll."}
          </p>
        )}
      </div>

      {errorMessage && <p className="mb-3 text-sm text-red-400">{errorMessage}</p>}

      {reordering ? (
        <div className={gridClassName}>
          {items.map((item, i) => (
            <div
              key={getId(item)}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className="relative cursor-grab active:cursor-grabbing"
            >
              <span
                className="absolute end-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-bg/90 font-mono text-muted shadow-sm"
                aria-hidden
              >
                ⠿
              </span>
              {renderCard(item)}
            </div>
          ))}
        </div>
      ) : (
        renderNormal(items)
      )}
    </div>
  );
}
