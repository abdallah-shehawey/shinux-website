"use client";

import { useEffect, useMemo, useState } from "react";
import ArticleReorderGrid from "./ArticleReorderGrid";
import TagFilterDropdown from "./TagFilterDropdown";
import { useSearch } from "@/lib/use-search";
import { useSession } from "@/lib/use-session";
import { useUrlQuery } from "@/lib/use-url-query";
import type { ArticleMeta } from "@/lib/articles";
import type { Author } from "@/lib/site";

// Browsing happens entirely in the browser: the page ships every article once,
// and tag filtering, searching and the admin check all run from here.
//
// That is what lets /articles be a statically prerendered document instead of
// a server render on every visit. It used to read `searchParams` (which opts
// the whole route into dynamic rendering) and call getCurrentUser() + a
// profiles query, so clicking the Articles tab meant a serverless invocation
// and two Supabase round trips before a single byte came back. Now the tab is
// a CDN hit and the interactions below cost no round trip at all.
//
// Search is the one thing that still needs the server — it matches full
// article bodies, which are far too big to ship — so it goes to /api/search
// and comes back as a list of slugs to reorder what the browser already has.

/** Match what we hold in memory. Used when /api/search can't be reached, so
 *  search still narrows the list offline instead of coming back empty. */
function localMatch(articles: ArticleMeta[], term: string): string[] {
  const needle = term.trim().toLowerCase();
  return articles
    .filter((a) =>
      [a.title, a.description, ...a.tags].some((h) => h.toLowerCase().includes(needle)),
    )
    .map((a) => a.slug);
}

export default function ArticlesBrowser({
  articles,
  authors,
  tags,
}: {
  /** Every published article, in the admin's curated order. */
  articles: ArticleMeta[];
  authors: Record<string, Author>;
  tags: string[];
}) {
  const session = useSession();
  const isAdmin = session?.isAdmin ?? false;

  // Until the visitor touches a control these follow the URL, so a shared
  // /articles?q=…&tags=… link opens filtered; from the first interaction on,
  // local state owns them. Both start null rather than being seeded in an
  // effect — see use-url-query.ts for why that matters here.
  const urlQuery = useUrlQuery();
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const [pickedTags, setPickedTags] = useState<string[] | null>(null);

  const urlParams = useMemo(() => new URLSearchParams(urlQuery), [urlQuery]);
  const urlTags = useMemo(
    () => urlParams.get("tags")?.split(",").filter(Boolean) ?? [],
    [urlParams],
  );

  const query = typedQuery ?? urlParams.get("q") ?? "";
  const selected = pickedTags ?? urlTags;
  const selectedKey = selected.join(",");
  const touched = typedQuery !== null || pickedTags !== null;

  const { data, pending, failed } = useSearch<{ slugs: string[] }>("articles", query);
  const matchedSlugs = useMemo(() => {
    if (!query.trim()) return null;
    if (failed) return localMatch(articles, query);
    return data?.slugs ?? null;
  }, [articles, query, data, failed]);

  // Keep the URL shareable. history.replaceState (which Next supports
  // natively) rather than router.replace: the latter re-runs the server
  // component, which is the round trip this whole component exists to avoid.
  // Guarded on `touched` so the pass where the URL is first read back does not
  // immediately write a stripped version of it.
  useEffect(() => {
    if (!touched) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedKey) params.set("tags", selectedKey);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/articles?${qs}` : "/articles");
  }, [touched, query, selectedKey]);

  const visible = useMemo(() => {
    let list = articles;
    if (matchedSlugs) {
      const rank = new Map(matchedSlugs.map((slug, i) => [slug, i]));
      list = articles
        .filter((a) => rank.has(a.slug))
        .sort((a, b) => rank.get(a.slug)! - rank.get(b.slug)!);
    }
    return selected.length > 0
      ? list.filter((a) => a.tags.some((t) => selected.includes(t)))
      : list;
  }, [articles, matchedSlugs, selected]);

  function toggle(tag: string) {
    setPickedTags((prev) => {
      const current = prev ?? urlTags;
      return current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    });
  }

  function clearAll() {
    setTypedQuery("");
    setPickedTags([]);
  }

  const isFiltered = Boolean(query.trim()) || selected.length > 0;
  // While the first request for a term is still out there is nothing to show
  // yet; say so rather than flashing "no matches".
  const searching = pending && matchedSlugs === null;

  return (
    <>
      {/* Submitting is a no-op — results already track the input — but a real
          form means Enter and the on-screen keyboard's "search" key behave. */}
      <form onSubmit={(e) => e.preventDefault()} role="search" className="mb-8 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setTypedQuery(e.target.value)}
          placeholder="Search title, tags, or article text&hellip;"
          aria-label="Search articles"
          className="w-full max-w-sm rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
        />
        {tags.length > 0 && (
          <TagFilterDropdown
            tags={tags}
            selected={selected}
            onToggle={toggle}
            onClearAll={() => setPickedTags([])}
          />
        )}
        {isFiltered && (
          <button type="button" onClick={clearAll} className="btn-ghost">
            Clear
          </button>
        )}
      </form>

      {visible.length === 0 ? (
        <p className="text-muted">
          {searching
            ? "Searching…"
            : isFiltered
              ? "No articles match your search."
              : "No articles yet."}
        </p>
      ) : (
        <ArticleReorderGrid
          initialItems={visible}
          authors={authors}
          // Reordering a filtered subset would be ambiguous, so it is only
          // offered on the default, unfiltered view.
          isAdmin={isAdmin && !isFiltered}
        />
      )}
    </>
  );
}
