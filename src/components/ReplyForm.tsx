"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";
import Avatar from "@/components/Avatar";
import MentionTextarea from "@/components/MentionTextarea";
import type { ThreadViewer } from "@/lib/viewer";

/**
 * The reply box under one answer. Open state and draft text live in the parent
 * (AnswerThread) rather than here, because "Reply" on an individual comment has
 * to open THIS box with that person already @mentioned — the same thing
 * Facebook does when you reply to a comment.
 */
export default function ReplyForm({
  answerId,
  viewer,
  loginNext,
  open,
  onOpenChange,
  body,
  onBodyChange,
  focusKey,
}: {
  answerId: string;
  /** null when signed out — the box then only offers a way in. */
  viewer: ThreadViewer | null;
  loginNext: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  body: string;
  onBodyChange: (body: string) => void;
  /** Bumped by the parent on every Reply click; re-aims an open box. */
  focusKey: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Closed is the resting state: the Reply actions on the answer and on each
  // reply are what open it, so there is nothing to show here until they do.
  if (!open) return null;

  if (!viewer) {
    return (
      // dir="ltr" goes on the SPAN, not on .reply-row: the row draws its
      // connector elbow from logical properties, so flipping its direction
      // would put the elbow on the wrong side of an Arabic thread.
      <p className="reply-row pt-2 text-sm text-muted">
        <span dir="ltr">
          <Link
            href={`/login?next=${encodeURIComponent(loginNext)}`}
            className="font-semibold text-accent hover:underline"
          >
            Log in
          </Link>{" "}
          to reply.
        </span>
      </p>
    );
  }

  async function submit() {
    if (!body.trim() || status === "loading") return;
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="reply-row pt-2"
    >
      <div className="flex gap-2">
        <Avatar name={viewer.displayName} avatar={viewer.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="composer-field">
            <MentionTextarea
              required
              autoFocus
              focusKey={focusKey}
              autoGrow
              dir="auto"
              rows={1}
              value={body}
              onChange={onBodyChange}
              onEnterSubmit={submit}
              placeholder="Write a reply… @ to mention someone"
              aria-label="Write a reply"
              textareaClassName="composer-input text-base sm:text-sm"
              mentionButton="icon"
              toolbarClassName="flex items-center justify-end gap-0.5 pb-0.5"
              toolbarExtra={
                <button
                  type="submit"
                  disabled={status === "loading" || !body.trim()}
                  title="Post reply"
                  aria-label="Post reply"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-accent transition hover:bg-bg active:scale-90 disabled:cursor-not-allowed disabled:text-muted disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    // The plane always points along the reading direction.
                    className="rtl:-scale-x-100"
                  >
                    <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
                  </svg>
                </button>
              }
            />
          </div>

          <div className="mt-1 flex items-center gap-3 px-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold text-muted transition hover:text-fg"
            >
              Cancel
            </button>
            <p className="font-mono text-[0.7rem] text-muted">
              {status === "loading" ? "Posting…" : "Enter to post · Shift+Enter for a new line"}
            </p>
          </div>

          {status === "error" && <p className="mt-1 text-xs text-red-400">{errorMessage}</p>}
        </div>
      </div>
    </form>
  );
}
