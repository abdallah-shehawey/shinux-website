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
import { site, siteAuthor } from "@/lib/site";
import { getAuthorProfiles } from "@/lib/authors";
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
      className={`card active:scale-[0.98] active:opacity-90 transition-colors hover:border-accent ${align === "end" ? "sm:text-end" : ""}`}
    >
      <p className="text-xs text-muted">
        {align === "end" ? <>{label} &rarr;</> : <>&larr; {label}</>}
      </p>
      <p
        className="mt-1 font-medium"
        dir="auto"
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

  // Render every available language's Markdown up front (in parallel); the
  // in-page toggle in <ArticleReader> just swaps between these pre-rendered
  // HTML strings.
  const rendered: Record<string, RenderedLocale> = Object.fromEntries(
    await Promise.all(
      article.locales.map(async (loc) => {
        const t = article.translations[loc];
        const { html, toc } = await renderMarkdown(t.body);
        return [loc, { title: t.title, html, toc, readingMinutes: t.readingMinutes }] as const;
      }),
    ),
  );

  const { prev, next } = getPrevNext(slug);
  const related = getRelatedArticles(slug);

  const authors = await getAuthorProfiles(
    [article.author, ...related.map((a) => a.author)].filter((a): a is string => Boolean(a)),
  );
  // getAuthorProfiles always yields an entry for a known username (falling back
  // to the raw handle), so siteAuthor is only for articles with no `author`
  // frontmatter at all.
  const author = (article.author && authors[article.author]) || siteAuthor;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    inLanguage: article.locale,
    keywords: article.tags.join(", "),
    author: { "@type": "Person", name: author.name },
    mainEntityOfPage: `${siteUrl}/articles/${slug}`,
  };

  return (
    <>
      <div className="sticky top-14 z-10 bg-bg">
        <div className="mx-auto flex h-11 w-full items-center px-4 sm:px-8 lg:px-12">
          <Link href="/articles" prefetch={true} scroll={false} className="text-sm text-muted hover:text-accent transition-colors">
            &larr; Back to articles
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full px-4 pt-4 pb-12 sm:px-8 lg:px-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <ArticleReader
          date={article.date}
          tags={article.tags}
          locales={article.locales}
          defaultLocale={article.locale}
          rendered={rendered}
        >
          <div className="mt-10">
            <AuthorCard author={author} label="Written by" />
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
              <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
                {related.map((a) => (
                  <ArticleCard
                    key={a.slug}
                    article={a}
                    readingLabel={readingLabel(a.readingMinutes)}
                    author={a.author ? authors[a.author] : null}
                  />
                ))}
              </div>
            </div>
          )}
        </ArticleReader>
      </div>
    </>
  );
}
