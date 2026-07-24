"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ArticleReorderGrid from "./ArticleReorderGrid";
import TagFilterDropdown from "./TagFilterDropdown";
import type { ArticleMeta } from "@/lib/articles";
import type { Author } from "@/lib/site";

// Tag filtering happens entirely in the browser. The full (search-scoped)
// article list is already in the client payload, so routing a checkbox tick
// through the server would mean an RSC round-trip — plus the auth/profile
// queries the page does — just to hide a few cards. That made every click
// feel like the page had frozen. Here a tick is a plain setState: checkbox
// and grid repaint in the same frame.
//
// The URL is still kept in sync (shareable/reloadable links) via
// history.replaceState, which Next supports natively and which — unlike
// router.replace — does not re-run the server component.
//
// Search stays a real GET submit: `q` needs the server to rank matches.
export default function ArticlesBrowser({
  articles,
  authors,
  tags,
  q,
  initialTags,
  isAdmin,
}: {
  /** Every article for the current search — unfiltered by tag. */
  articles: ArticleMeta[];
  authors: Record<string, Author>;
  tags: string[];
  q?: string;
  initialTags: string[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialTags);
  const selectedKey = selected.join(",");

  // Skip the first run: the URL already says what the server rendered, and
  // rewriting it on mount would be a no-op write on every page load.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (selectedKey) params.set("tags", selectedKey);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/articles?${qs}` : "/articles");
  }, [selectedKey, q]);

  const visible = useMemo(
    () =>
      selected.length > 0
        ? articles.filter((a) => a.tags.some((t) => selected.includes(t)))
        : articles,
    [articles, selected],
  );

  function toggle(tag: string) {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  // Clearing tags is instant; clearing an active search is not — dropping `q`
  // needs the server to rebuild the unsearched list, so that one navigates.
  function clearAll() {
    if (q) router.push("/articles");
    else setSelected([]);
  }

  const isFiltered = Boolean(q) || selected.length > 0;

  return (
    <>
      <form method="get" action="/articles" className="mb-8 flex flex-wrap gap-2">
        {selected.length > 0 && <input type="hidden" name="tags" value={selectedKey} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search title, tags, or article text&hellip;"
          className="w-full max-w-sm rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
        />
        <button type="submit" className="btn-ghost">
          Search
        </button>
        {tags.length > 0 && (
          <TagFilterDropdown
            tags={tags}
            selected={selected}
            onToggle={toggle}
            onClearAll={() => setSelected([])}
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
          {isFiltered ? "No articles match your search." : "No articles yet."}
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
