import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getArticle,
  getArticles,
  getPrevNext,
  getRelatedArticles,
} from "@/lib/articles";
import { renderMarkdown } from "@/lib/markdown";
import { routing } from "@/i18n/routing";
import { siteAuthor } from "@/lib/site";
import TableOfContents from "@/components/TableOfContents";
import AuthorCard from "@/components/AuthorCard";
import ArticleCard from "@/components/ArticleCard";
import CopyCodeButtons from "@/components/CopyCodeButtons";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getArticles(locale).map((a) => ({ locale, slug: a.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = getArticle(locale, slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.description,
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      publishedTime: article.date,
      tags: article.tags,
      locale,
    },
  };
}

const CONTENT_ID = "article-body";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const article = getArticle(locale, slug);
  if (!article) notFound();

  const t = await getTranslations("article");
  const { html, toc } = await renderMarkdown(article.body);
  const { prev, next } = getPrevNext(locale, slug);
  const related = getRelatedArticles(locale, slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link href="/articles" className="text-sm text-muted hover:text-accent">
        &larr; {t("backToArticles")}
      </Link>

      <article className="mt-6 grid gap-10 lg:grid-cols-[1fr_16rem]">
        <div>
          <header className="mb-8">
            <p className="mb-2 font-mono text-xs text-muted">
              {article.date} · {t("readingTime", { minutes: article.readingMinutes })}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {article.title}
            </h1>
            {article.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/articles?tag=${encodeURIComponent(tag)}`}
                    className="tag-chip"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </header>

          <div
            id={CONTENT_ID}
            className="prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <CopyCodeButtons containerId={CONTENT_ID} />

          <div className="mt-10">
            <AuthorCard author={siteAuthor} label={t("writtenBy")} />
          </div>

          {(prev || next) && (
            <nav className="mt-8 grid gap-3 sm:grid-cols-2">
              {prev && (
                <Link href={`/articles/${prev.slug}`} className="card">
                  <p className="text-xs text-muted">&larr; {t("prev")}</p>
                  <p className="mt-1 font-medium">{prev.title}</p>
                </Link>
              )}
              {next && (
                <Link
                  href={`/articles/${next.slug}`}
                  className="card sm:text-end"
                >
                  <p className="text-xs text-muted">{t("next")} &rarr;</p>
                  <p className="mt-1 font-medium">{next.title}</p>
                </Link>
              )}
            </nav>
          )}

          {related.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 text-lg font-semibold">{t("related")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((a) => (
                  <ArticleCard
                    key={a.slug}
                    article={a}
                    readingLabel={t("readingTime", { minutes: a.readingMinutes })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <TableOfContents items={toc} title={t("toc")} />
          </div>
        </aside>
      </article>
    </div>
  );
}
