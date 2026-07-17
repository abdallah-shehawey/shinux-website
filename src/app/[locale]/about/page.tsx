import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { site, siteAuthor } from "@/lib/site";
import AuthorCard from "@/components/AuthorCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title") };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{t("title")}</h1>

      <div className="mb-8">
        <AuthorCard author={siteAuthor} label={t("linksTitle")} />
      </div>

      <p className="text-lg leading-relaxed text-muted">
        {t("intro", { name: siteAuthor.name })}
      </p>

      {site.socials.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("linksTitle")}
          </h2>
          <ul className="flex flex-wrap gap-3">
            {site.socials.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
