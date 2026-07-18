import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getQuestionBySlug,
  getAnswersForQuestion,
  getRepliesForAnswers,
  hasUserUpvoted,
  type AnswerRecord,
  type ReplyRecord,
} from "@/lib/questions";
import { renderMarkdown } from "@/lib/markdown";
import { detectDirection } from "@/lib/bidi";
import { getCurrentUser } from "@/lib/supabase/server";
import UpvoteButton from "@/components/UpvoteButton";
import AnswerForm from "@/components/AnswerForm";
import ReplyForm from "@/components/ReplyForm";
import AuthorInline from "@/components/AuthorInline";

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

async function AnswerBlock({
  answer,
  replies,
  isLoggedIn,
  loginNext,
}: {
  answer: AnswerRecord;
  replies: ReplyRecord[];
  isLoggedIn: boolean;
  loginNext: string;
}) {
  const { html } = await renderMarkdown(answer.body);

  return (
    <div className="card">
      <p className="mb-3 flex items-center gap-2 font-mono text-xs text-muted">
        <AuthorInline
          name={answer.author_display ?? "Deleted user"}
          username={answer.author_username}
          avatar={answer.author_avatar}
        />
        <span>&middot;</span>
        <span>{formatDate(answer.created_at)}</span>
      </p>
      <div
        className="prose max-w-none"
        dir={detectDirection(answer.body)}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="mt-4 border-t border-border pt-3">
        {replies.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {replies.map((r) => (
              <div key={r.id} className="ps-3" style={{ borderInlineStart: "2px solid var(--border)" }}>
                <p className="flex items-center gap-2 font-mono text-xs text-muted">
                  <AuthorInline
                    name={r.author_display ?? "Deleted user"}
                    username={r.author_username}
                    avatar={r.author_avatar}
                  />
                  <span>&middot;</span>
                  <span>{formatDate(r.created_at)}</span>
                </p>
                <p className="mt-0.5 text-sm text-fg" dir="auto">
                  {r.body}
                </p>
              </div>
            ))}
          </div>
        )}
        <ReplyForm answerId={answer.id} isLoggedIn={isLoggedIn} loginNext={loginNext} />
      </div>
    </div>
  );
}

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // The auth lookup doesn't depend on the question — run both together.
  const [question, user] = await Promise.all([getQuestionBySlug(slug), getCurrentUser()]);
  if (!question) notFound();

  const [answers, upvoted, { html: bodyHtml }] = await Promise.all([
    getAnswersForQuestion(question.id),
    user ? hasUserUpvoted(question.id, user.id) : Promise.resolve(false),
    renderMarkdown(question.body),
  ]);

  // One round trip for every answer's replies instead of one per answer.
  const repliesByAnswer = await getRepliesForAnswers(answers.map((a) => a.id));

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
        <AuthorInline
          name={question.author_display}
          username={question.author_username}
          avatar={question.author_avatar}
        />
        <span>&middot;</span>
        <span>{formatDate(question.created_at)}</span>
        {question.locale === "ar" && <span className="tag-chip">AR</span>}
      </div>

      <h1
        className="mb-4 text-3xl font-bold tracking-tight"
        dir="auto"
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
              <AnswerBlock
                key={answer.id}
                answer={answer}
                replies={repliesByAnswer.get(answer.id) ?? []}
                isLoggedIn={Boolean(user)}
                loginNext={currentPath}
              />
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
