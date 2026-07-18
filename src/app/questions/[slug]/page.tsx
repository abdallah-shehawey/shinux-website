import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getQuestionBySlug,
  getAnswersForQuestion,
  hasUserUpvoted,
  type AnswerRecord,
} from "@/lib/questions";
import { renderMarkdown } from "@/lib/markdown";
import { createClient } from "@/lib/supabase/server";
import UpvoteButton from "@/components/UpvoteButton";
import AnswerForm from "@/components/AnswerForm";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function excerpt(text: string, max = 160): string {
  const plain = text.replace(/[#*`>_\-\[\]()]/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const question = await getQuestionBySlug(slug);
  if (!question) return {};

  return {
    title: question.title,
    description: excerpt(question.body),
    openGraph: {
      title: question.title,
      description: excerpt(question.body),
      type: "website",
    },
  };
}

async function AnswerBlock({ answer }: { answer: AnswerRecord }) {
  const { html } = await renderMarkdown(answer.body);
  return (
    <div className="card">
      <p className="mb-3 font-mono text-xs text-muted">
        {answer.author_display ?? "Deleted user"} &middot; {formatDate(answer.created_at)}
      </p>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const question = await getQuestionBySlug(slug);
  if (!question) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [answers, upvoted, { html: bodyHtml }] = await Promise.all([
    getAnswersForQuestion(question.id),
    user ? hasUserUpvoted(question.id, user.id) : Promise.resolve(false),
    renderMarkdown(question.body),
  ]);

  // Built from question.slug (straight from the DB) rather than the route
  // param — Next.js hands dynamic segments to this component still
  // percent-encoded for non-ASCII (Arabic) slugs, see getQuestionBySlug.
  const currentPath = `/questions/${question.slug}`;
  const isRtl = question.locale === "ar";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: question.title,
      text: excerpt(question.body, 500),
      answerCount: question.answer_count,
      upvoteCount: question.upvote_count,
      dateCreated: question.created_at,
      author: { "@type": "Person", name: question.author_display },
      suggestedAnswer: answers.map((a) => ({
        "@type": "Answer",
        text: excerpt(a.body, 500),
        dateCreated: a.created_at,
        author: { "@type": "Person", name: a.author_display ?? "Deleted user" },
      })),
    },
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/questions" className="text-sm text-muted hover:text-accent">
        &larr; Back to questions
      </Link>

      <div className="mt-4 mb-2 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
        <span>{question.author_display}</span>
        <span>&middot;</span>
        <span>{formatDate(question.created_at)}</span>
        {question.locale === "ar" && <span className="tag-chip">AR</span>}
      </div>

      <h1
        className="mb-4 text-3xl font-bold tracking-tight"
        dir={isRtl ? "rtl" : "ltr"}
        lang={question.locale}
      >
        {question.title}
      </h1>

      {question.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {question.tags.map((tag) => (
            <Link key={tag} href={`/questions?tag=${encodeURIComponent(tag)}`} className="tag-chip">
              {tag}
            </Link>
          ))}
        </div>
      )}

      <div
        className="prose max-w-none"
        dir={isRtl ? "rtl" : "ltr"}
        lang={question.locale}
        style={isRtl ? { fontFamily: "var(--font-ibm-plex-arabic)" } : undefined}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <div className="mt-6">
        <UpvoteButton
          questionId={question.id}
          initialUpvoted={upvoted}
          initialCount={question.upvote_count}
          isLoggedIn={Boolean(user)}
          loginNext={currentPath}
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">
          {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
        </h2>
        {answers.length === 0 ? (
          <p className="text-sm text-muted">No answers yet — be the first to help out.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {answers.map((answer) => (
              <AnswerBlock key={answer.id} answer={answer} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <AnswerForm questionId={question.id} isLoggedIn={Boolean(user)} loginNext={currentPath} />
      </div>
    </div>
  );
}
