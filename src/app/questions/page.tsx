import type { Metadata } from "next";
import Link from "next/link";
import { getPublicQuestions, getAllQuestionTags } from "@/lib/questions";
import QuestionCard from "@/components/QuestionCard";

export const metadata: Metadata = { title: "Questions" };

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;

  const [questions, tags] = await Promise.all([
    getPublicQuestions({ search: q, tag }),
    getAllQuestionTags(),
  ]);

  const tagHref = (t?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (t) params.set("tag", t);
    const qs = params.toString();
    return qs ? `/questions?${qs}` : "/questions";
  };

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
        <p className="mt-2 text-muted">
          An archive of Linux questions asked by the community, answered by anyone.
        </p>
      </header>

      <form method="get" action="/questions" className="mb-6 flex gap-2">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search questions&hellip;"
          className="w-full max-w-sm rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
        <button type="submit" className="btn-ghost">
          Search
        </button>
        {(q || tag) && (
          <Link href="/questions" className="btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link href={tagHref()} className="tag-chip" data-active={!tag}>
            All
          </Link>
          {tags.map((tg) => (
            <Link key={tg} href={tagHref(tg)} className="tag-chip" data-active={tag === tg}>
              {tg}
            </Link>
          ))}
        </div>
      )}

      {questions.length === 0 ? (
        <p className="text-muted">
          {q || tag ? "No questions match your search." : "No questions yet — be the first to ask."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      )}

      <div className="mt-10">
        <Link href="/ask" className="btn-primary">
          Ask a question
        </Link>
      </div>
    </div>
  );
}
