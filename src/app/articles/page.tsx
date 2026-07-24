import type { Metadata } from "next";
import { getArticles, getAllTags } from "@/lib/articles";
import { getAuthorProfiles } from "@/lib/authors";
import { getArticleOrder } from "@/lib/article-order";
import { applyCustomOrder } from "@/lib/custom-order";
import ArticlesBrowser from "@/components/ArticlesBrowser";

export const metadata: Metadata = { title: "Articles" };

// Deliberately free of `searchParams` and of any cookies()/auth call, which is
// what keeps this route statically prerendered. Either one would opt it into
// dynamic rendering, and this is one of the site's main tabs — a tab click
// would then cost a serverless render plus two Supabase round trips (the user
// lookup and the admin-role query) before the first byte. Search, tag
// filtering and the admin check all happen in ArticlesBrowser instead; the
// admin's pin order and the author profiles come from tag-invalidated caches,
// so editing either still refreshes this page.
export default async function ArticlesPage() {
  const tags = getAllTags();
  const articles = applyCustomOrder(getArticles(), await getArticleOrder());
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

      <ArticlesBrowser articles={articles} authors={authors} tags={tags} />
    </div>
  );
}
