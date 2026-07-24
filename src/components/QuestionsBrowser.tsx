"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QuestionReorderGrid from "./QuestionReorderGrid";
import { applyQuestionOrder } from "@/lib/custom-order";
import { useSearch } from "@/lib/use-search";
import { useSession } from "@/lib/use-session";
import { useUrlQuery } from "@/lib/use-url-query";
import type { QuestionSummary } from "@/lib/questions";

// Browsing the Q&A archive, entirely client-side, so /questions can be a
// statically prerendered document. Reading `searchParams` for `q`/`tag` and
// calling getCurrentUser() for the admin badge were forcing a server render
// on every visit to the Questions tab; the whole published list already comes
// down with the page, so filtering it here costs nothing.
//
// Only full-text search still needs the server (it matches question bodies,
// which the listing does not carry) — that goes to /api/search.

export default function QuestionsBrowser({
  questions,
  order,
  tags,
}: {
  /** Every public question in its natural order: unanswered first, newest first. */
  questions: QuestionSummary[];
  /** question id -> pinned position, applied only to the default browse view. */
  order: Record<string, number>;
  tags: string[];
}) {
  const session = useSession();
  const isAdmin = session?.isAdmin ?? false;

  // Both follow the URL until the visitor touches a control — see
  // use-url-query.ts.
  const urlQuery = useUrlQuery();
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const [pickedTag, setPickedTag] = useState<string | null | undefined>(undefined);

  const urlParams = useMemo(() => new URLSearchParams(urlQuery), [urlQuery]);
  const query = typedQuery ?? urlParams.get("q") ?? "";
  const tag = pickedTag === undefined ? urlParams.get("tag") : pickedTag;
  const touched = typedQuery !== null || pickedTag !== undefined;

  useEffect(() => {
    if (!touched) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/questions?${qs}` : "/questions");
  }, [touched, query, tag]);

  const { data, pending, failed } = useSearch<{ ids: string[] }>("questions", query);
  const isDefaultView = !query.trim() && !tag;

  const visible = useMemo(() => {
    let list = questions;

    if (query.trim()) {
      const term = query.trim().toLowerCase();
      // Offline, match the titles we hold rather than showing nothing; online,
      // the server has already matched bodies too.
      const ids = failed
        ? questions.filter((q) => q.title.toLowerCase().includes(term)).map((q) => q.id)
        : (data?.ids ?? null);
      if (!ids) return [];
      const rank = new Map(ids.map((id, i) => [id, i]));
      list = list.filter((q) => rank.has(q.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    }

    if (tag) list = list.filter((q) => q.tags.includes(tag));

    // The admin's pin order applies to the default browse view only — ranking
    // a search or a tag slice by unrelated curation would be arbitrary.
    return isDefaultView ? applyQuestionOrder(list, order) : list;
  }, [questions, query, tag, data, failed, order, isDefaultView]);

  const searching = pending && visible.length === 0;

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()} role="search" className="mb-6 flex gap-2">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setTypedQuery(e.target.value)}
          placeholder="Search questions&hellip;"
          aria-label="Search questions"
          className="w-full max-w-sm rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
        />
        {!isDefaultView && (
          <button
            type="button"
            onClick={() => {
              setTypedQuery("");
              setPickedTag(null);
            }}
            className="btn-ghost"
          >
            Clear
          </button>
        )}
      </form>

      {tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPickedTag(null)}
            className="tag-chip"
            data-active={!tag}
          >
            All
          </button>
          {tags.map((tg) => (
            <button
              key={tg}
              type="button"
              onClick={() => setPickedTag(tag === tg ? null : tg)}
              className="tag-chip"
              data-active={tag === tg}
            >
              {tg}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-muted">
          {searching
            ? "Searching…"
            : isDefaultView
              ? "No questions yet — be the first to ask."
              : "No questions match your search."}
        </p>
      ) : (
        <QuestionReorderGrid initialItems={visible} isAdmin={isAdmin && isDefaultView} />
      )}

      <div className="mt-10">
        <Link href="/ask" className="btn-primary">
          Ask a question
        </Link>
      </div>
    </>
  );
}
