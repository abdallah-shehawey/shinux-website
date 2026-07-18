import Link from "next/link";
import type { QuestionSummary } from "@/lib/questions";

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
  const isRtl = question.locale === "ar";
  return (
    <Link
      href={`/questions/${question.slug}`}
      className="card flex flex-col gap-2 transition-colors hover:border-accent"
    >
      <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
        <span>{question.author_display}</span>
        <span>&middot;</span>
        <span>{timeAgo(question.created_at)}</span>
        {question.locale === "ar" && <span className="tag-chip">AR</span>}
        {question.status === "answered" && (
          <span className="tag-chip" data-active="true">
            Answered
          </span>
        )}
      </p>
      <h3
        className="text-lg font-semibold text-fg"
        dir={isRtl ? "rtl" : "ltr"}
        lang={question.locale}
      >
        {question.title}
      </h3>
      {question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {question.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="mt-1 font-mono text-xs text-muted">
        {question.answer_count} {question.answer_count === 1 ? "answer" : "answers"} &middot;{" "}
        {question.upvote_count} {question.upvote_count === 1 ? "upvote" : "upvotes"}
      </p>
    </Link>
  );
}
