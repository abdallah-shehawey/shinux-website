import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getArticles } from "@/lib/articles";
import { getArticleOrder, applyCustomOrder } from "@/lib/article-order";
import ArticleOrderEditor from "@/components/ArticleOrderEditor";

export const metadata: Metadata = { title: "Admin · Articles" };

export default async function AdminArticlesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") notFound();

  const order = await getArticleOrder();
  const articles = applyCustomOrder(getArticles(), order);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-8">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Reorder articles</h1>
      <p className="mb-8 text-muted">
        This order drives the homepage&apos;s &ldquo;Latest articles&rdquo; and the
        <code className="mx-1 tag-chip">/articles</code> listing. Anything you haven&apos;t
        touched yet stays sorted by date, after whatever you&apos;ve explicitly placed.
      </p>
      <ArticleOrderEditor
        initial={articles.map((a) => ({ slug: a.slug, title: a.title, date: a.date }))}
      />
    </div>
  );
}
