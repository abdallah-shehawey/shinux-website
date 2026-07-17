import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getArticle,
  getArticles,
  getPrevNext,
  getRelatedArticles,
  type ArticleMeta,
} from "@/lib/articles";
import { renderMarkdown } from "@/lib/markdown";
import { siteAuthor } from "@/lib/site";
import AuthorCard from "@/components/AuthorCard";
import ArticleCard from "@/components/ArticleCard";
import ArticleReader, { type RenderedLocale } from "@/components/ArticleReader";

export function generateStaticParams() {
  return getArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
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
    },
  };
}

function readingLabel(minutes: number) {
  return `${minutes} min read`;
}

// The site chrome (back link, prev/next labels, "Written by", …) is always
// English/LTR. Only the article's OWN title/tags/body switch to RTL + the
// Arabic font when that specific article's frontmatter says locale: ar.
function AdjacentCard({
  article,
  label,
  align,
}: {
  article: ArticleMeta;
  label: string;
  align: "start" | "end";
}) {
  const isRtl = article.locale === "ar";
  return (
    <Link
      href={`/articles/${article.slug}`}
      className={`card ${align === "end" ? "sm:text-end" : ""}`}
    >
      <p className="text-xs text-muted">
        {align === "end" ? <>{label} &rarr;</> : <>&larr; {label}</>}
      </p>
      <p
        className="mt-1 font-medium"
        dir={isRtl ? "rtl" : "ltr"}
        lang={article.locale}
        style={isRtl ? { fontFamily: "var(--font-ibm-plex-arabic)" } : undefined}
      >
        {article.title}
      </p>
    </Link>
  );
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const article = getArticle(slug);
  if (!article) notFound();

  // Render every available language's Markdown up front; the in-page toggle in
  // <ArticleReader> just swaps between these pre-rendered HTML strings.
  const rendered: Record<string, RenderedLocale> = {};
  for (const loc of article.locales) {
    const t = article.translations[loc];
    const { html, toc } = await renderMarkdown(t.body);
    rendered[loc] = {
      title: t.title,
      html,
      toc,
      readingMinutes: t.readingMinutes,
    };
  }

  const { prev, next } = getPrevNext(slug);
  const related = getRelatedArticles(slug);

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <Link href="/articles" className="text-sm text-muted hover:text-accent">
        &larr; Back to articles
      </Link>

      <ArticleReader
        date={article.date}
        tags={article.tags}
        locales={article.locales}
        defaultLocale={article.locale}
        rendered={rendered}
      >
        <div className="mt-10">
          <AuthorCard author={siteAuthor} label="Written by" />
        </div>

        {(prev || next) && (
          <nav className="mt-8 grid gap-3 sm:grid-cols-2">
            {prev && <AdjacentCard article={prev} label="Previous" align="start" />}
            {next && <AdjacentCard article={next} label="Next" align="end" />}
          </nav>
        )}

        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">Related articles</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map((a) => (
                <ArticleCard
                  key={a.slug}
                  article={a}
                  readingLabel={readingLabel(a.readingMinutes)}
                />
              ))}
            </div>
          </div>
        )}
      </ArticleReader>
    </div>
  );
}
