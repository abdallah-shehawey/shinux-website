import type { Metadata } from "next";
import Link from "next/link";
import { getPublicQuestions, getCachedPublicQuestions, getAllQuestionTags } from "@/lib/questions";
import { getQuestionOrder, applyQuestionOrder } from "@/lib/question-order";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import QuestionReorderGrid from "@/components/QuestionReorderGrid";

export const metadata: Metadata = { title: "Questions" };

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;

  // Everything up front in one parallel burst; the admin-role lookup below
  // only runs for signed-in users.
  const [user, rawQuestions, tags, order] = await Promise.all([
    getCurrentUser(),
    // Default browse view is served from the data cache; live search stays on
    // the uncached path (arbitrary terms would mint unbounded cache entries).
    q ? getPublicQuestions({ search: q, tag }) : getCachedPublicQuestions(tag),
    getAllQuestionTags(),
    getQuestionOrder(),
  ]);

  let isAdmin = false;
  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
  }
  // Same rule as articles: the admin's pin order only applies to the default,
  // unfiltered browse view — search/tag results stay in their natural order.
  const isDefaultView = !q && !tag;
  const questions = isDefaultView ? applyQuestionOrder(rawQuestions, order) : rawQuestions;

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
          className="w-full max-w-sm rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
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
        <QuestionReorderGrid initialItems={questions} isAdmin={isAdmin && isDefaultView} />
      )}

      <div className="mt-10">
        <Link href="/ask" className="btn-primary">
          Ask a question
        </Link>
      </div>
    </div>
  );
}
