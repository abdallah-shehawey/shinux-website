import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

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

      <section className="grid gap-6 pb-20 sm:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-lg font-semibold">{t("latestArticles")}</h2>
          <p className="text-sm text-muted">{t("comingSoon")}</p>
        </div>
        <div className="card">
          <h2 className="mb-2 text-lg font-semibold">{t("latestQuestions")}</h2>
          <p className="text-sm text-muted">{t("comingSoon")}</p>
        </div>
      </section>
    </div>
  );
}
