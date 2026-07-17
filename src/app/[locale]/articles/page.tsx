import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getArticles, getAllTags } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";

export default async function ArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { locale } = await params;
  const { tag } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("articlesPage");
  const tReading = await getTranslations("article");

  const allArticles = getArticles(locale);
  const tags = getAllTags(locale);
  const articles = tag ? allArticles.filter((a) => a.tags.includes(tag)) : allArticles;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("subtitle")}</p>
      </header>

      {tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link href="/articles" className="tag-chip" data-active={!tag}>
            {t("allTags")}
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
        <p className="text-muted">{tag ? t("noResults") : t("empty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {articles.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
              readingLabel={tReading("readingTime", { minutes: article.readingMinutes })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
