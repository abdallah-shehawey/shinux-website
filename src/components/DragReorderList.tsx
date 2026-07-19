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
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const scrollSpeedRef = useRef(0);
  // The rendered card node per item id, so the drag ghost can be a picture of
  // the card itself rather than whatever the browser picks (see onDragStart).
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

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

  // Every card contains a full-cover <a> (the link that opens the article /
  // question / track). Left to itself the browser treats that anchor as the
  // drag source and shows its generic link-or-file icon as the ghost, which is
  // what made dragging look like dragging a file around. Two things fix it:
  // the card content is pointer-events-none while reordering (so the wrapper,
  // not the anchor, is always the drag source), and the ghost is explicitly set
  // to a snapshot of the card, grabbed under the cursor where it was picked up.
  // setData() is also required for Firefox to start a drag at all.
  function onDragStart(e: React.DragEvent<HTMLDivElement>, index: number, id: string) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    const card = cardRefs.current.get(id);
    if (card) {
      const rect = card.getBoundingClientRect();
      e.dataTransfer.setDragImage(card, e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  function onDrop(targetIndex: number) {
    setOverIndex(null);
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setItems(next);
    setDragIndex(null);
    persist(next);
  }

  // Touch-friendly primary reordering path — native HTML5 drag-and-drop
  // doesn't work on touch devices, and the admin administers from a phone.
  function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setItems(next);
    persist(next);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setReordering((v) => !v)}
          className="btn-ghost min-h-11"
        >
          {reordering ? "Done reordering" : "Reorder"}
        </button>
        {reordering && (
          <p className="text-sm text-muted">
            {saving
              ? "Saving…"
              : "Drag cards to set the order everyone sees. Drag near the top/bottom edge to scroll."}
          </p>
        )}
      </div>

      {errorMessage && <p className="mb-3 text-sm text-red-400">{errorMessage}</p>}

      {reordering ? (
        <div className={gridClassName}>
          {items.map((item, i) => {
            const id = getId(item);
            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => onDragStart(e, i, id)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setOverIndex(i)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDrop={() => onDrop(i)}
                className={`relative cursor-grab rounded-xl transition active:cursor-grabbing ${
                  dragIndex === i
                    ? "opacity-40"
                    : overIndex === i && dragIndex !== null
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-bg"
                      : ""
                }`}
              >
                {/* z-20: above the card's own full-cover link *and* above
                    AuthorInline's z-10 link, otherwise a tap on ↑ lands on the
                    author underneath it and opens their profile. */}
                <span
                  className="absolute end-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-bg/95 font-mono text-muted shadow-sm"
                  aria-hidden
                >
                  ⠿
                </span>
                <span className="absolute start-2 top-2 z-20 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-bg/95 font-mono text-muted shadow-sm disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    aria-label="Move down"
                    className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-bg/95 font-mono text-muted shadow-sm disabled:opacity-30"
                  >
                    ↓
                  </button>
                </span>
                {/* Inert while reordering: the card's links must not swallow
                    the drag (see onDragStart) or navigate on a mis-tap. */}
                <div
                  ref={(node) => {
                    if (node) cardRefs.current.set(id, node);
                    else cardRefs.current.delete(id);
                  }}
                  className="pointer-events-none h-full select-none"
                >
                  {renderCard(item)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        renderNormal(items)
      )}
    </div>
  );
}
