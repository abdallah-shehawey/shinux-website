import type { Metadata } from "next";
import Link from "next/link";
import { getArticles, getAllTags, searchArticles } from "@/lib/articles";
import { getAuthorProfiles } from "@/lib/authors";
import { getArticleOrder, applyCustomOrder } from "@/lib/article-order";
import ArticleCard from "@/components/ArticleCard";

export const metadata: Metadata = { title: "Articles" };

function readingLabel(minutes: number) {
  return `${minutes} min read`;
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  const { tag, q } = await searchParams;

  const tags = getAllTags();
  // The admin's explicit "pin order" (see /admin/articles) only makes sense
  // when browsing/filtering by category — an active search should rank by
  // match relevance/date, not by unrelated curation.
  const base = q
    ? searchArticles(q)
    : applyCustomOrder(getArticles(), await getArticleOrder());
  const articles = tag ? base.filter((a) => a.tags.includes(tag)) : base;
  const authors = await getAuthorProfiles(
    articles.map((a) => a.author).filter((a): a is string => Boolean(a)),
  );

  const tagHref = (t?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (t) params.set("tag", t);
    const qs = params.toString();
    return qs ? `/articles?${qs}` : "/articles";
  };

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        <p className="mt-2 text-muted">
          Guides, fixes, and write-ups about Linux and the terminal.
        </p>
      </header>

      <form method="get" action="/articles" className="mb-6 flex gap-2">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search title, tags, or article text&hellip;"
          className="w-full max-w-sm rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
        <button type="submit" className="btn-ghost">
          Search
        </button>
        {(q || tag) && (
          <Link href="/articles" className="btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link href={tagHref()} className="tag-chip" data-active={!tag}>
            All
          </Link>
          {tags.map((tg) => (
            <Link key={tg} href={tagHref(tg)} className="tag-chip" data-active={tag === tg}>
              {tg}
            </Link>
          ))}
        </div>
      )}

      {articles.length === 0 ? (
        <p className="text-muted">
          {q || tag ? "No articles match your search." : "No articles yet."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
              readingLabel={readingLabel(article.readingMinutes)}
              author={article.author ? authors[article.author] : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
