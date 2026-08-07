import Link from "next/link";
import type { QuestionSummary } from "@/lib/questions";
import AuthorInline from "./AuthorInline";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function QuestionCard({ question }: { question: QuestionSummary }) {
  return (
    // Relative + a full-cover link underneath so the whole card still opens
    // the question, while AuthorInline's own link (above it, z-10) stays
    // independently clickable to the asker's profile.
    <div className="card group relative flex h-full flex-col gap-2 transition-all duration-150 hover:border-accent">
      {/* Viewport prefetch off — see ArticleCard for why the card grids must
          not compete with the header tabs for a slow connection. */}
      <Link
        href={`/questions/${question.slug}`}
        prefetch={false}
        className="card-hit absolute inset-0 z-0"
        aria-label={question.title}
      />
      <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
        <AuthorInline
          name={question.author_display}
          username={question.author_username}
          avatar={question.author_avatar}
        />
        <span>&middot;</span>
        <span>{timeAgo(question.created_at)}</span>
        {question.locale === "ar" && <span className="tag-chip">AR</span>}
        {question.status === "answered" && (
          <span className="tag-chip" data-active="true">
            Answered
          </span>
        )}
      </p>
      <div className="flex-grow flex-1 min-h-0">
        <h3 className="line-clamp-2 text-lg font-semibold text-fg group-hover:text-accent transition-colors" dir="auto" lang={question.locale}>
          {question.title}
        </h3>
      </div>
      {question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {question.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>
      )}
      {/* Answers only — the question upvote was removed, so its count would be
          a number nothing can ever move. */}
      <p className="mt-1 font-mono text-xs text-muted">
        {question.answer_count} {question.answer_count === 1 ? "answer" : "answers"}
      </p>
    </div>
  );
}
