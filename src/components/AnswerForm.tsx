"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";
import Avatar from "@/components/Avatar";
import MentionTextarea from "@/components/MentionTextarea";
import { ANSWER_COMPOSER_ID } from "@/components/QuestionActions";
import type { ThreadViewer } from "@/lib/viewer";

// The box you answer a question in: your avatar, one growing field, a way to
// mention someone, and Post. Deliberately no Markdown editor and no preview —
// you write an answer the way you write a comment, and what you typed is what
// appears. (Bodies still go through the renderer so that the answers written
// before this change keep their formatting; see renderBody in questions.ts.)
export default function AnswerForm({
  questionId,
  viewer,
  loginNext,
}: {
  questionId: string;
  /** null when signed out — the box then only offers a way in. */
  viewer: ThreadViewer | null;
  loginNext: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!viewer) {
    return (
      <div id={ANSWER_COMPOSER_ID} className="card text-center">
        {/* dir="ltr": this English sentence can sit inside an Arabic question's
            section, where it would otherwise put its full stop first. */}
        <p dir="ltr" className="text-sm text-muted">
          <Link
            href={`/login?next=${encodeURIComponent(loginNext)}`}
            className="font-semibold text-accent hover:underline"
          >
            Log in
          </Link>{" "}
          to post an answer.
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }

    const { error } = await supabase
      .from("answers")
      .insert({ question_id: questionId, author_id: user.id, body: body.trim() });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setBody("");
    setStatus("idle");
    // Bust the cached thread BEFORE refreshing, or the refresh re-serves it.
    await revalidateQuestionCaches();
    router.refresh();
  }

  return (
    <form id={ANSWER_COMPOSER_ID} onSubmit={onSubmit} className="flex gap-2.5">
      <Avatar name={viewer.displayName} avatar={viewer.avatarUrl} size="md" />

      <div className="min-w-0 flex-1">
        <div className="composer-field">
          <MentionTextarea
            required
            autoGrow
            dir="auto"
            rows={2}
            value={body}
            onChange={setBody}
            aria-label="Write an answer"
            placeholder="Write an answer… type @ to mention someone"
            textareaClassName="composer-input text-base sm:text-sm"
            mentionButton="icon"
            toolbarClassName="flex items-center pb-0.5"
          />
        </div>

        {status === "error" && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}

        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={status === "loading" || !body.trim()}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Posting…" : "Post answer"}
          </button>
        </div>
      </div>
    </form>
  );
}
