import Link from "next/link";
import { getArticles } from "@/lib/articles";
import { getPublicQuestions } from "@/lib/questions";
import { getAuthorProfiles } from "@/lib/authors";
import { getArticleOrder, applyCustomOrder } from "@/lib/article-order";
import { getQuestionOrder, applyQuestionOrder } from "@/lib/question-order";
import ArticleCard from "@/components/ArticleCard";
import QuestionCard from "@/components/QuestionCard";

function readingLabel(minutes: number) {
  return `${minutes} min read`;
}

export default async function HomePage() {
  // The admin's pin order (see the "Reorder" button on /articles and
  // /questions) drives both of these sections too, so "Latest" doubles as a
  // lightweight "Featured" pick once they've used it.
  const [articleOrder, allQuestions, questionOrder] = await Promise.all([
    getArticleOrder(),
    getPublicQuestions(),
    getQuestionOrder(),
  ]);
  const latestArticles = applyCustomOrder(getArticles(), articleOrder).slice(0, 3);
  const latestQuestions = applyQuestionOrder(
    allQuestions.filter((q) => q.status === "answered"),
    questionOrder,
  ).slice(0, 3);
  const authors = await getAuthorProfiles(
    latestArticles.map((a) => a.author).filter((a): a is string => Boolean(a)),
  );

  return (
    <div className="mx-auto w-full px-4 sm:px-8 lg:px-12">
      <section className="py-20 text-center sm:text-start">
        <p className="mb-3 font-mono text-sm text-accent">
          <span className="text-muted">$</span> whoami
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Welcome to the Linux blog
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted sm:mx-0">
          Guides, fixes, and a Q&amp;A archive about Linux and the terminal.
        </p>
        <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
          <Link href="/articles" className="btn-primary">
            Browse articles
          </Link>
          <Link href="/ask" className="btn-ghost">
            Ask a question
          </Link>
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Latest articles</h2>
          <Link href="/articles" className="text-sm text-accent hover:underline">
            Browse articles &rarr;
          </Link>
        </div>
        {latestArticles.length === 0 ? (
          <p className="text-sm text-muted">Coming soon&hellip;</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {latestArticles.map((article) => (
              <ArticleCard
                key={article.slug}
                article={article}
                readingLabel={readingLabel(article.readingMinutes)}
                author={article.author ? authors[article.author] : null}
              />
            ))}
          </div>
        )}
      </section>

      <section className="pb-20">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Latest answered questions</h2>
          <Link href="/questions" className="text-sm text-accent hover:underline">
            Browse questions &rarr;
          </Link>
        </div>
        {latestQuestions.length === 0 ? (
          <div className="card">
            <p className="text-sm text-muted">
              No answered questions yet.{" "}
              <Link href="/ask" className="text-accent hover:underline">
                Ask the first one
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {latestQuestions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
