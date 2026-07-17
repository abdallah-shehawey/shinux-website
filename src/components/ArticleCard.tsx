import Link from "next/link";
import type { ArticleMeta } from "@/lib/articles";

export default function ArticleCard({
  article,
  readingLabel,
}: {
  article: ArticleMeta;
  readingLabel: string;
}) {
  const isRtl = article.locale === "ar";

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="card flex flex-col gap-2 transition-colors hover:border-accent"
    >
      <p className="flex items-center gap-2 font-mono text-xs text-muted">
        <span>
          {article.date} · {readingLabel}
        </span>
        {isRtl && <span className="tag-chip">AR</span>}
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
    </Link>
  );
}
