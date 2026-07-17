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
import TableOfContents from "@/components/TableOfContents";
import AuthorCard from "@/components/AuthorCard";
import ArticleCard from "@/components/ArticleCard";
import CopyCodeButtons from "@/components/CopyCodeButtons";

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

const CONTENT_ID = "article-body";

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

  const isRtl = article.locale === "ar";
  const { html, toc } = await renderMarkdown(article.body);
  const { prev, next } = getPrevNext(slug);
  const related = getRelatedArticles(slug);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-8 lg:px-12">
      <Link href="/articles" className="text-sm text-muted hover:text-accent">
        &larr; Back to articles
      </Link>

      <article className="mt-6 grid gap-10 lg:grid-cols-[1fr_16rem]">
        <div>
          <header
            className="mb-8"
            dir={isRtl ? "rtl" : "ltr"}
            lang={article.locale}
            style={isRtl ? { fontFamily: "var(--font-ibm-plex-arabic)" } : undefined}
          >
            <p className="mb-2 font-mono text-xs text-muted" dir="ltr">
              {article.date} · {readingLabel(article.readingMinutes)}
              {isRtl && <span className="ms-2 tag-chip">AR</span>}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {article.title}
            </h1>
            {article.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" dir="ltr">
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
            dir={isRtl ? "rtl" : "ltr"}
            lang={article.locale}
            style={isRtl ? { fontFamily: "var(--font-ibm-plex-arabic)" } : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <CopyCodeButtons containerId={CONTENT_ID} />

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
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <TableOfContents
              items={toc}
              title="On this page"
              dir={isRtl ? "rtl" : "ltr"}
              lang={article.locale}
            />
          </div>
        </aside>
      </article>
    </div>
  );
}
