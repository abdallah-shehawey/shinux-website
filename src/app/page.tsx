import Link from "next/link";
import { getLatestArticles } from "@/lib/articles";
import ArticleCard from "@/components/ArticleCard";

function readingLabel(minutes: number) {
  return `${minutes} min read`;
}

export default function HomePage() {
  const latestArticles = getLatestArticles(3);

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
              />
            ))}
          </div>
        )}
      </section>

      <section className="pb-20">
        <h2 className="mb-4 text-lg font-semibold">Latest answered questions</h2>
        <div className="card">
          <p className="text-sm text-muted">Coming in the next phase&hellip;</p>
        </div>
      </section>
    </div>
  );
}
