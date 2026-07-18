"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface OrderableArticle {
  slug: string;
  title: string;
  date: string;
}

export default function ArticleOrderEditor({ initial }: { initial: OrderableArticle[] }) {
  const [items, setItems] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function persist(next: OrderableArticle[]) {
    setSaving(true);
    setErrorMessage("");
    const supabase = createClient();
    const { error } = await supabase
      .from("article_order")
      .upsert(next.map((item, i) => ({ slug: item.slug, position: i })));
    setSaving(false);
    if (error) setErrorMessage(error.message);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    persist(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
      {saving && <p className="text-xs text-muted">Saving&hellip;</p>}
      {items.map((item, i) => (
        <div key={item.slug} className="card flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="btn-ghost px-2 py-0.5 text-xs disabled:opacity-30"
              aria-label="Move up"
            >
              &uarr;
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              className="btn-ghost px-2 py-0.5 text-xs disabled:opacity-30"
              aria-label="Move down"
            >
              &darr;
            </button>
          </div>
          <span className="font-mono text-xs text-muted">#{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{item.title}</p>
            <p className="text-xs text-muted">{item.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
