import Link from "next/link";
import type { ArticleMeta } from "@/lib/articles";
import type { Author } from "@/lib/site";
import AuthorInline from "./AuthorInline";

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
    // Relative + a full-cover link underneath so the whole card still opens
    // the article, while the author footer's own link (above it, z-10) stays
    // independently clickable to their profile.
    <div className="card active:scale-[0.98] active:opacity-90 relative flex h-full flex-col gap-2 transition-colors hover:border-accent">
      <Link
        href={`/articles/${article.slug}`}
        className="absolute inset-0 z-0"
        aria-label={article.title}
      />
      <p className="flex items-center gap-2 font-mono text-xs text-muted">
        <span>
          {article.date} · {readingLabel}
        </span>
        {langBadge && <span className="tag-chip">{langBadge}</span>}
      </p>
      <div className="flex-1" dir={isRtl ? "rtl" : "ltr"} lang={article.locale}>
        <h3 className="line-clamp-2 text-lg font-semibold text-fg" dir="auto">
          {article.title}
        </h3>
        {article.description && (
          <p className="line-clamp-2 text-sm text-muted" dir="auto">
            {article.description}
          </p>
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
        <div className="mt-1 border-t border-border pt-2 text-xs text-muted">
          <AuthorInline name={author.name} username={author.username} avatar={author.avatar} />
        </div>
      )}
    </div>
  );
}
