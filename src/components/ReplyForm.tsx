"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";
import MentionTextarea from "@/components/MentionTextarea";

/**
 * The reply box under one answer. Open state and draft text live in the parent
 * (AnswerReplies) rather than here, because "Reply" on an individual comment has
 * to open THIS box with that person already @mentioned — the same thing
 * Facebook does when you reply to a comment.
 */
export default function ReplyForm({
  answerId,
  isLoggedIn,
  loginNext,
  open,
  onOpenChange,
  body,
  onBodyChange,
}: {
  answerId: string;
  isLoggedIn: boolean;
  loginNext: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  body: string;
  onBodyChange: (body: string) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="text-xs text-muted hover:text-accent"
      >
        Reply
      </button>
    );
  }

  if (!isLoggedIn) {
    return (
      <p className="text-xs text-muted">
        <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="text-accent hover:underline">
          Log in
        </Link>{" "}
        to reply.
      </p>
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
      .from("answer_replies")
      .insert({ answer_id: answerId, author_id: user.id, body: body.trim() });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    onBodyChange("");
    onOpenChange(false);
    setStatus("idle");
    await revalidateQuestionCaches();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <MentionTextarea
        required
        dir="auto"
        rows={2}
        value={body}
        onChange={onBodyChange}
        placeholder="Reply… type @ to mention someone"
        textareaClassName="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-base sm:text-sm text-fg outline-none focus:border-accent"
      />
      {status === "error" && <p className="text-xs text-red-400">{errorMessage}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={status === "loading"} className="btn-ghost px-3 py-2 text-sm">
          {status === "loading" ? "Posting…" : "Post reply"}
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="px-3 py-2 text-sm text-muted hover:text-fg"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
