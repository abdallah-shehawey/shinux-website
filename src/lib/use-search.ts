"use client";

import { useEffect, useState } from "react";

// Long enough that a normal typing burst fires one request, short enough that
// results feel like they arrive as you type.
const DEBOUNCE_MS = 220;

export type SearchScope = "articles" | "lessons" | "questions";

export interface SearchState<T> {
  /** null ⇒ no active term, or the term's results have not landed yet. */
  data: T | null;
  pending: boolean;
  /** The request failed (typically offline) — the caller falls back to
   *  matching whatever it already holds in memory. */
  failed: boolean;
}

interface Settled<T> {
  term: string;
  data: T | null;
  failed: boolean;
}

/**
 * Debounced full-text search against /api/search.
 *
 * The listing pages are statically prerendered, so they cannot search on the
 * server the way a `?q=` page could — but the bodies being searched are far
 * too big to ship to the browser. This keeps the matching server-side while
 * leaving the page itself a CDN document. See src/app/api/search/route.ts.
 */
export function useSearch<T>(scope: SearchScope, term: string): SearchState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const query = term.trim();

  useEffect(() => {
    if (!query) return;

    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?in=${scope}&q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`search ${res.status}`);
        const data = (await res.json()) as T;
        if (alive) setSettled({ term: query, data, failed: false });
      } catch {
        // Offline, or the search endpoint is unreachable. Report it so the
        // caller can degrade to a local title/tag match rather than showing
        // an empty result set.
        if (alive) setSettled({ term: query, data: null, failed: true });
      }
    }, DEBOUNCE_MS);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [scope, query]);

  // Derived rather than stored, so results for a stale term can never be shown
  // against a newer one, and clearing the box needs no state update at all.
  const current = settled && settled.term === query ? settled : null;
  return {
    data: query ? (current?.data ?? null) : null,
    pending: Boolean(query) && current === null,
    failed: Boolean(current?.failed),
  };
}
