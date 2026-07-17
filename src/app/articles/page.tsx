import type { Metadata } from "next";
import Link from "next/link";
import { getArticles, getAllTags } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";

export const metadata: Metadata = { title: "Articles" };

function readingLabel(minutes: number) {
  return `${minutes} min read`;
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;

  const allArticles = getArticles();
  const tags = getAllTags();
  const articles = tag ? allArticles.filter((a) => a.tags.includes(tag)) : allArticles;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-8 lg:px-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        <p className="mt-2 text-muted">
          Guides, fixes, and write-ups about Linux and the terminal.
        </p>
      </header>

      {tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link href="/articles" className="tag-chip" data-active={!tag}>
            All
          </Link>
          {tags.map((tg) => (
            <Link
              key={tg}
              href={`/articles?tag=${encodeURIComponent(tg)}`}
              className="tag-chip"
              data-active={tag === tg}
            >
              {tg}
            </Link>
          ))}
        </div>
      )}

      {articles.length === 0 ? (
        <p className="text-muted">
          {tag ? "No articles match this tag." : "No articles yet."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
              readingLabel={readingLabel(article.readingMinutes)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
