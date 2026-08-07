import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuestionThread } from "@/lib/questions";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ogCard } from "@/lib/site";
import type { ThreadViewer } from "@/lib/viewer";
import QuestionContent from "@/components/QuestionContent";
import QuestionActions from "@/components/QuestionActions";
import AnswerThread from "@/components/AnswerThread";
import AnswerForm from "@/components/AnswerForm";

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
      images: [ogCard],
    },
    twitter: {
      title: question.title,
      description: excerpt(question.body),
      images: [ogCard],
    },
  };
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
  const { question, questionHtml, answers, repliesByAnswer, mentionHandles } = thread;

  // Session-scoped read: only signed-in visitors pay it. One profile row does
  // two jobs — gating the admin controls, and giving the composers an avatar to
  // draw next to the box.
  let isAdmin = false;
  let viewer: ThreadViewer | null = null;
  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name, username, avatar_url")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
    viewer = {
      id: user.id,
      displayName: profile?.display_name || profile?.username || "You",
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    };
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
    <>
      <div className="sticky top-14 z-10 bg-bg">
        <div className="mx-auto flex h-11 w-full max-w-3xl items-center px-4 sm:px-6">
          <Link
            href="/questions"
            prefetch={true}
            scroll={false}
            className="text-sm text-muted transition-colors hover:text-accent"
          >
            &larr; Back to questions
          </Link>
        </div>
      </div>

      {/* A discussion reads as a column, not a page-wide document: the thread is
          capped so a long answer keeps a comfortable measure and the replies
          stay visibly nested under what they answer. */}
      <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-16 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <QuestionContent
          questionId={question.id}
          authorId={question.author_id}
          currentUserId={user?.id ?? null}
          title={question.title}
          body={question.body}
          bodyHtml={questionHtml}
          locale={question.locale}
          tags={question.tags}
          images={question.images ?? []}
          authorDisplay={question.author_display}
          authorUsername={question.author_username}
          authorAvatar={question.author_avatar}
          createdAt={question.created_at}
          isAdmin={isAdmin}
        />

        <QuestionActions />

        {/* The answers section follows the QUESTION's language: its heading and
            composer belong to the question, while each answer inside sets its
            own direction from its own text. */}
        <section
          dir={question.locale === "ar" ? "rtl" : "ltr"}
          className="mt-4 border-t border-border pt-5"
        >
          {/* dir="ltr" on the English UI strings inside this section: without
              it, an Arabic question's section reorders "1 answer" to
              "answer 1" and throws the full stop to the front of a sentence.
              The attribute isolates them, so they still sit on the section's
              own side. */}
          <h2 className="mb-4 text-sm font-semibold text-muted">
            <span dir="ltr">
              {answers.length === 0
                ? "Answers"
                : `${answers.length} ${answers.length === 1 ? "answer" : "answers"}`}
            </span>
          </h2>

          {answers.length === 0 ? (
            <p dir="ltr" className="mb-5 text-sm text-muted">
              No answers yet — be the first to help out.
            </p>
          ) : (
            <div className="mb-6 flex flex-col gap-5">
              {answers.map((answer) => (
                <AnswerThread
                  key={answer.id}
                  answer={answer}
                  replies={repliesByAnswer[answer.id] ?? []}
                  viewer={viewer}
                  loginNext={currentPath}
                  isAdmin={isAdmin}
                  mentionHandles={mentionHandles}
                />
              ))}
            </div>
          )}

          <AnswerForm questionId={question.id} viewer={viewer} loginNext={currentPath} />
        </section>
      </div>
    </>
  );
}
