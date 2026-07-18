import Link from "next/link";
import type { ArticleMeta } from "@/lib/articles";
import type { Author } from "@/lib/site";

export default function ArticleCard({
  article,
  readingLabel,
  author,
}: {
  article: ArticleMeta;
  readingLabel: string;
  /** Resolved from article.author (a username) via src/lib/authors.ts, when present. */
  author?: Author | null;
}) {
  const isRtl = article.locale === "ar";
  // Bilingual articles advertise every language they carry (e.g. "EN · AR");
  // single-language Arabic articles keep the plain "AR" tag as before.
  const langBadge =
    article.locales.length > 1
      ? article.locales.map((l) => l.toUpperCase()).join(" · ")
      : article.locale === "ar"
        ? "AR"
        : null;

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="card flex flex-col gap-2 transition-colors hover:border-accent"
    >
      <p className="flex items-center gap-2 font-mono text-xs text-muted">
        <span>
          {article.date} · {readingLabel}
        </span>
        {langBadge && <span className="tag-chip">{langBadge}</span>}
      </p>
      <div dir={isRtl ? "rtl" : "ltr"} lang={article.locale}>
        <h3 className="text-lg font-semibold text-fg">{article.title}</h3>
        {article.description && (
          <p className="text-sm text-muted">{article.description}</p>
        )}
      </div>
      {article.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>
      )}
      {author && (
        <div className="mt-1 flex items-center gap-2 border-t border-border pt-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-mono text-[10px] font-bold text-accent-fg">
            {author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatar} alt={author.name} className="h-full w-full object-cover" />
            ) : (
              author.name.trim().charAt(0).toUpperCase()
            )}
          </div>
          <span className="text-xs text-muted">
            {author.name} <span className="text-muted/70">@{author.username}</span>
          </span>
        </div>
      )}
    </Link>
  );
}
