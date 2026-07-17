import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLatestArticles } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tArticle = await getTranslations("article");
  const latestArticles = getLatestArticles(locale, 3);

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="py-20 text-center sm:text-start">
        <p className="mb-3 font-mono text-sm text-accent">
          <span className="text-muted">$</span> {t("prompt")}
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted sm:mx-0">
          {t("heroSubtitle")}
        </p>
        <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
          <Link href="/articles" className="btn-primary">
            {t("browseArticles")}
          </Link>
          <Link href="/ask" className="btn-ghost">
            {t("askQuestion")}
          </Link>
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{t("latestArticles")}</h2>
          <Link href="/articles" className="text-sm text-accent hover:underline">
            {t("browseArticles")} &rarr;
          </Link>
        </div>
        {latestArticles.length === 0 ? (
          <p className="text-sm text-muted">{t("comingSoon")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {latestArticles.map((article) => (
              <ArticleCard
                key={article.slug}
                article={article}
                readingLabel={tArticle("readingTime", { minutes: article.readingMinutes })}
              />
            ))}
          </div>
        )}
      </section>

      <section className="pb-20">
        <h2 className="mb-4 text-lg font-semibold">{t("latestQuestions")}</h2>
        <div className="card">
          <p className="text-sm text-muted">{t("comingSoon")}</p>
        </div>
      </section>
    </div>
  );
}
