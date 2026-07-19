import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getQuestionThread,
  hasUserUpvoted,
  type AnswerWithHtml,
  type ReplyRecord,
} from "@/lib/questions";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import UpvoteButton from "@/components/UpvoteButton";
import AnswerForm from "@/components/AnswerForm";
import ReplyForm from "@/components/ReplyForm";
import QuestionContent from "@/components/QuestionContent";
import AnswerContent from "@/components/AnswerContent";
import ReplyItem from "@/components/ReplyItem";

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
  const question = (await getQuestionThread(slug))?.question;
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

function AnswerBlock({
  answer,
  replies,
  isLoggedIn,
  loginNext,
  isAdmin,
  currentUserId,
}: {
  answer: AnswerWithHtml;
  replies: ReplyRecord[];
  isLoggedIn: boolean;
  loginNext: string;
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  return (
    <div className="card">
      <AnswerContent
        answerId={answer.id}
        authorId={answer.author_id}
        body={answer.body}
        bodyHtml={answer.html}
        authorDisplay={answer.author_display ?? "Deleted user"}
        authorUsername={answer.author_username}
        authorAvatar={answer.author_avatar}
        createdAt={answer.created_at}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />

      <div className="mt-4 border-t border-border pt-3">
        {replies.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {replies.map((r) => (
              <ReplyItem key={r.id} reply={r} currentUserId={currentUserId} isAdmin={isAdmin} />
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

  // The whole public thread (question + rendered bodies + answers + replies)
  // comes from the Next data cache — only the auth lookup is per-request.
  const [thread, user] = await Promise.all([getQuestionThread(slug), getCurrentUser()]);
  if (!thread) notFound();
  const { question, questionHtml, answers, repliesByAnswer } = thread;

  // Session-scoped reads: only signed-in visitors pay them, and in parallel.
  let upvoted = false;
  let isAdmin = false;
  if (user) {
    const supabase = await createClient();
    [upvoted, isAdmin] = await Promise.all([
      hasUserUpvoted(question.id, user.id),
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => profile?.role === "admin"),
    ]);
  }

  // Built from question.slug (straight from the DB) rather than the route
  // param — Next.js hands dynamic segments to this component still
  // percent-encoded for non-ASCII (Arabic) slugs, see getQuestionBySlug.
  const currentPath = `/questions/${question.slug}`;

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
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/questions" className="text-sm text-muted hover:text-accent">
        &larr; Back to questions
      </Link>

      <QuestionContent
        questionId={question.id}
        authorId={question.author_id}
        currentUserId={user?.id ?? null}
        title={question.title}
        body={question.body}
        bodyHtml={questionHtml}
        locale={question.locale}
        tags={question.tags}
        authorDisplay={question.author_display}
        authorUsername={question.author_username}
        authorAvatar={question.author_avatar}
        createdAt={question.created_at}
        isAdmin={isAdmin}
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
                replies={repliesByAnswer[answer.id] ?? []}
                isLoggedIn={Boolean(user)}
                loginNext={currentPath}
                isAdmin={isAdmin}
                currentUserId={user?.id ?? null}
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
