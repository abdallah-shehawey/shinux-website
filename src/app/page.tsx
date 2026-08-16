import Link from "next/link";
import { FaGlobe } from "react-icons/fa";
import { getArticles } from "@/lib/articles";
import { getCachedPublicQuestions } from "@/lib/questions";
import { getAuthorProfile, getAuthorProfiles } from "@/lib/authors";
import { getArticleOrder } from "@/lib/article-order";
import { applyCustomOrder, applyQuestionOrder } from "@/lib/custom-order";
import { getQuestionOrder } from "@/lib/question-order";
import { getTracks } from "@/lib/tutorials";
import { getTutorialTrackOrder } from "@/lib/tutorial-order";
import { site, siteAuthor } from "@/lib/site";
import ArticleCard from "@/components/ArticleCard";
import QuestionCard from "@/components/QuestionCard";
import TrackCard from "@/components/TrackCard";
import TerminalHero from "@/components/TerminalHero";

function readingLabel(minutes: number) {
  return `${minutes} min read`;
}

// A few career highlights, mirrored from my portfolio (abdallahshehawey.vercel.app),
// so the home page says who's behind the writing at a glance.
const authorHighlights = [
  { value: "20+", label: "Embedded projects" },
  { value: "650+", label: "Training Hours" },
  { value: "5★", label: "HackerRank C" },
];

export default async function HomePage() {
  // The admin's pin order (see the "Reorder" button on /articles and
  // /questions) drives both of these sections too, so "Latest" doubles as a
  // lightweight "Featured" pick once they've used it.
  const [articleOrder, allQuestions, questionOrder, tutorialOrder, author] = await Promise.all(
    [
      getArticleOrder(),
      getCachedPublicQuestions(),
      getQuestionOrder(),
      getTutorialTrackOrder(),
      getAuthorProfile(siteAuthor.username).catch(() => null),
    ],
  );
  const latestArticles = applyCustomOrder(getArticles(), articleOrder).slice(
    0,
    3,
  );
  const latestTutorials = applyCustomOrder(getTracks(), tutorialOrder).slice(
    0,
    3,
  );
  const latestQuestions = applyQuestionOrder(
    allQuestions.filter((q) => q.status === "answered"),
    questionOrder,
  ).slice(0, 3);
  const authors = await getAuthorProfiles(
    [
      ...latestArticles.map((a) => a.author),
      ...latestTutorials.flatMap((t) => t.authors),
    ].filter((a): a is string => Boolean(a)),
  );
  const authorName = author?.name ?? siteAuthor.name;

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <div className="space-y-12">
        <section>
          {/* Terminal box — sized to content, not full width */}
          <div className="mb-8">
            <TerminalHero authorName={authorName} />
          </div>

          {/* Hero text + WHOAMI card — balanced 2-column row */}
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-[1fr_1.1fr]">
            {/* Left column: hero text + buttons, centered vertically, natural flow */}
            <div className="flex h-full flex-col justify-center space-y-6 text-center sm:text-start">
              <h1 className="text-2xl font-bold tracking-tight sm:text-5xl">
                Notes from below the OS
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted sm:mx-0">
                Embedded Linux, RTOS internals, and everything else on the way
                from firmware to the kernel — write-ups, hands-on tutorials,
                and a Q&amp;A archive.
              </p>
              <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted sm:mx-0">
                From bare-metal register programming on ARM Cortex-M to building
                custom Linux images with Yocto and Buildroot — every article
                here comes from real projects, real datasheets, and real
                debugging sessions. Topics span device drivers, AUTOSAR BSW,
                real-time scheduling, CAN/LIN networking, Linux administration,
                and DevOps essentials like Ansible, Docker, CI/CD pipelines, and
                Git workflows.
              </p>
              <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
                <Link href="/articles" className="btn-primary">
                  Browse articles
                </Link>
                <Link href="/tutorials" className="btn-ghost">
                  Explore tutorials
                </Link>
                <Link href="/ask" className="btn-ghost">
                  Ask a question
                </Link>
              </div>
            </div>

            {/* Right column: Who's behind the writing — condensed from my portfolio */}
            <div className="card flex flex-col justify-center">
              <p className="mb-1 font-mono text-xs uppercase tracking-wide text-accent">
                {"// whoami"}
              </p>
              <h2 className="mb-3 text-xl font-semibold tracking-tight">
                {authorName}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                Embedded software engineer and an Electronics &amp;
                Communication Engineering graduate of Al-Azhar University (May
                2026 — Cumulative Grade: Very Good). I write firmware in C/C++,
                build device drivers from the datasheet up, and care about
                deterministic, real-time code —
                automotive-grade, RTOS-based systems (CAN, LIN, UART, SPI, I2C)
                and the AUTOSAR stack. Lately I&apos;m going deeper into
                Embedded Linux — kernel fundamentals, Yocto, and Buildroot — and
                this blog is where I write that part down.
              </p>
              <ul className="mt-5 flex flex-row flex-wrap gap-x-6 gap-y-3">
                {authorHighlights.map((h) => (
                  <li key={h.label}>
                    <div className="font-mono text-lg font-bold text-accent">
                      {h.value}
                    </div>
                    <div className="text-xs text-muted">{h.label}</div>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={site.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-1.5"
                >
                  <FaGlobe className="h-4 w-4" aria-hidden />
                  View My Portfolio
                </a>
                <Link href="/about" className="btn-ghost">
                  More about me
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Latest articles</h2>
            <Link
              href="/articles"
              className="text-sm text-accent hover:underline"
            >
              Browse articles &rarr;
            </Link>
          </div>
          {latestArticles.length === 0 ? (
            <p className="text-sm text-muted">Coming soon&hellip;</p>
          ) : (
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Latest tutorials</h2>
            <Link
              href="/tutorials"
              className="text-sm text-accent hover:underline"
            >
              Explore tutorials &rarr;
            </Link>
          </div>
          {latestTutorials.length === 0 ? (
            <p className="text-sm text-muted">Coming soon&hellip;</p>
          ) : (
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latestTutorials.map((track) => (
                <TrackCard
                  key={track.slug}
                  track={track}
                  authors={authors}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Latest answered questions</h2>
            <Link
              href="/questions"
              className="text-sm text-accent hover:underline"
            >
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
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latestQuestions.map((question) => (
                <QuestionCard key={question.id} question={question} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
