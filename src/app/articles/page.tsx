import type { Metadata } from "next";
import Link from "next/link";
import { getArticles, getAllTags, searchArticles } from "@/lib/articles";
import { getAuthorProfiles } from "@/lib/authors";
import { getArticleOrder } from "@/lib/article-order";
import { applyCustomOrder } from "@/lib/custom-order";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import ArticleReorderGrid from "@/components/ArticleReorderGrid";
import TagFilterDropdown from "@/components/TagFilterDropdown";

export const metadata: Metadata = { title: "Articles" };

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string; q?: string }>;
}) {
  const { tags: tagsParam, q } = await searchParams;
  const selectedTags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];

  const user = await getCurrentUser();
  let isAdmin = false;
  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
  }

  const tags = getAllTags();
  // The admin's explicit pin order only makes sense when browsing/filtering
  // by category — an active search should rank by match relevance, not by
  // unrelated curation. Drag-to-reorder is also only offered on that default,
  // unfiltered view (reordering a filtered subset would be ambiguous).
  const isDefaultView = !q && selectedTags.length === 0;
  const base = q ? searchArticles(q) : applyCustomOrder(getArticles(), await getArticleOrder());
  const articles =
    selectedTags.length > 0 ? base.filter((a) => a.tags.some((t) => selectedTags.includes(t))) : base;
  const authors = await getAuthorProfiles(
    articles.map((a) => a.author).filter((a): a is string => Boolean(a)),
  );

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        <p className="mt-2 text-muted">
          Guides, fixes, and write-ups about Linux and the terminal.
        </p>
      </header>

      <form method="get" action="/articles" className="mb-8 flex flex-wrap gap-2">
        {selectedTags.length > 0 && <input type="hidden" name="tags" value={selectedTags.join(",")} />}
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
        {tags.length > 0 && <TagFilterDropdown tags={tags} selectedTags={selectedTags} q={q} basePath="/articles" />}
        {(q || selectedTags.length > 0) && (
          <Link href="/articles" className="btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {articles.length === 0 ? (
        <p className="text-muted">
          {q || selectedTags.length > 0 ? "No articles match your search." : "No articles yet."}
        </p>
      ) : (
        <ArticleReorderGrid
          initialItems={articles}
          authors={authors}
          isAdmin={isAdmin && isDefaultView}
        />
      )}
    </div>
  );
}
