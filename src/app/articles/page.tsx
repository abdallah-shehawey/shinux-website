import type { Metadata } from "next";
import { getArticles, getAllTags, searchArticles } from "@/lib/articles";
import { getAuthorProfiles } from "@/lib/authors";
import { getArticleOrder } from "@/lib/article-order";
import { applyCustomOrder } from "@/lib/custom-order";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import ArticlesBrowser from "@/components/ArticlesBrowser";

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
  // unrelated curation.
  const base = q ? searchArticles(q) : applyCustomOrder(getArticles(), await getArticleOrder());
  // Authors are resolved for the whole list, not just the tag-filtered slice:
  // the tag filter runs in the browser, so any article may become visible
  // without another trip to the server.
  const authors = await getAuthorProfiles(
    base.map((a) => a.author).filter((a): a is string => Boolean(a)),
  );

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        <p className="mt-2 text-muted">
          Guides, fixes, and write-ups about Linux and the terminal.
        </p>
      </header>

      <ArticlesBrowser
        articles={base}
        authors={authors}
        tags={tags}
        q={q}
        initialTags={selectedTags}
        isAdmin={isAdmin}
      />
    </div>
  );
}
