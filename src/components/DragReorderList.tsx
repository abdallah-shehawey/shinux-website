"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface DragReorderListProps<T> {
  initialItems: T[];
  getId: (item: T) => string;
  /** Normal (non-reordering) display — a full grid/list of cards. */
  renderNormal: (items: T[]) => React.ReactNode;
  /** One compact, draggable row shown while reordering. */
  renderRow: (item: T) => React.ReactNode;
  /** Table + column the position upsert writes to, e.g. "article_order" / "slug". */
  table: string;
  idColumn: string;
}

// Native HTML5 drag-and-drop — no extra dependency. Admin-only in practice
// (the toggle button is only ever rendered when the caller knows the viewer
// is an admin), but RLS is still what actually enforces the write on the
// server, same as every other admin mutation in this app.
export default function DragReorderList<T>({
  initialItems,
  getId,
  renderNormal,
  renderRow,
  table,
  idColumn,
}: DragReorderListProps<T>) {
  const [items, setItems] = useState(initialItems);
  const [reordering, setReordering] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function persist(next: T[]) {
    setSaving(true);
    setErrorMessage("");
    const supabase = createClient();
    const { error } = await supabase
      .from(table)
      .upsert(next.map((item, i) => ({ [idColumn]: getId(item), position: i })));
    setSaving(false);
    if (error) setErrorMessage(error.message);
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
            {saving ? "Saving…" : "Drag cards to set the order everyone sees."}
          </p>
        )}
      </div>

      {errorMessage && <p className="mb-3 text-sm text-red-400">{errorMessage}</p>}

      {reordering ? (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div
              key={getId(item)}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className="card flex cursor-grab items-center gap-3 active:cursor-grabbing"
            >
              <span className="font-mono text-muted" aria-hidden>
                ⠿
              </span>
              <span className="font-mono text-xs text-muted">#{i + 1}</span>
              <div className="min-w-0 flex-1">{renderRow(item)}</div>
            </div>
          ))}
        </div>
      ) : (
        renderNormal(items)
      )}
    </div>
  );
}
