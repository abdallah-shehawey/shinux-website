import { Link } from "@/i18n/navigation";
import type { ArticleMeta } from "@/lib/articles";

export default function ArticleCard({
  article,
  readingLabel,
}: {
  article: ArticleMeta;
  readingLabel: string;
}) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="card flex flex-col gap-2 transition-colors hover:border-accent"
    >
      <p className="font-mono text-xs text-muted">
        {article.date} · {readingLabel}
      </p>
      <h3 className="text-lg font-semibold text-fg">{article.title}</h3>
      {article.description && (
        <p className="text-sm text-muted">{article.description}</p>
      )}
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
