"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TutorialReorderGrid from "./TutorialReorderGrid";
import { useSearch } from "@/lib/use-search";
import { useSession } from "@/lib/use-session";
import { useUrlQuery } from "@/lib/use-url-query";
import type { LessonByAuthor, TrackMeta } from "@/lib/tutorials";
import type { Author } from "@/lib/site";

// The interactive half of /tutorials. Lives in the browser so the page itself
// stays a statically prerendered document — reading `searchParams` for `q` and
// calling getCurrentUser() for the admin check were together forcing a
// serverless render, plus two Supabase round trips, on every click of the
// Tutorials tab. See src/app/api/search/route.ts for where the lesson search
// went (it matches full lesson bodies, so it has to stay server-side).

export default function TutorialsBrowser({
  tracks,
  authors,
}: {
  tracks: TrackMeta[];
  authors: Record<string, Author>;
}) {
  const session = useSession();
  const isAdmin = session?.isAdmin ?? false;

  // Follows ?q= until the visitor types, then local state owns it — see
  // use-url-query.ts.
  const urlQuery = useUrlQuery();
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const query = typedQuery ?? new URLSearchParams(urlQuery).get("q") ?? "";

  useEffect(() => {
    if (typedQuery === null) return;
    const term = typedQuery.trim();
    window.history.replaceState(
      null,
      "",
      term ? `/tutorials?q=${encodeURIComponent(term)}` : "/tutorials",
    );
  }, [typedQuery]);

  const { data, pending, failed } = useSearch<{ lessons: LessonByAuthor[] }>("lessons", query);
  const searching = Boolean(query.trim());
  const results = data?.lessons ?? [];

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()} role="search" className="mb-8 flex gap-2">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setTypedQuery(e.target.value)}
          placeholder="Search lessons across every track&hellip;"
          aria-label="Search lessons"
          className="w-full max-w-sm rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
        />
        {searching && (
          <button type="button" onClick={() => setTypedQuery("")} className="btn-ghost">
            Clear
          </button>
        )}
      </form>

      {searching ? (
        failed ? (
          <p className="text-muted">
            Lesson search needs a connection — pick a track below instead.
          </p>
        ) : results.length === 0 ? (
          <p className="text-muted">{pending ? "Searching…" : "No lessons match your search."}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {results.map((l) => (
              <Link
                key={`${l.track}/${l.slug}`}
                href={`/tutorials/${l.track}/${l.slug}`}
                className="card active:scale-[0.98] active:opacity-90 flex items-center justify-between gap-3 transition-colors hover:border-accent"
              >
                <span className="text-sm font-medium text-fg">{l.title}</span>
                <span className="tag-chip shrink-0">{l.trackTitle}</span>
              </Link>
            ))}
          </div>
        )
      ) : tracks.length === 0 ? (
        <p className="text-muted">No tutorials yet.</p>
      ) : (
        <TutorialReorderGrid initialItems={tracks} authors={authors} isAdmin={isAdmin} />
      )}
    </>
  );
}
