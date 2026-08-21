"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import MentionTextarea from "@/components/MentionTextarea";
import type { CommentTarget } from "@/lib/comments";
import type { ThreadViewer } from "@/lib/viewer";

/**
 * The box a comment or a reply is written in.
 *
 * One component for both because they are the same control: the only
 * differences are the placeholder, whether there is a Cancel next to the hint,
 * and the `parentId` the row is filed under. The draft lives in the CALLER, not
 * here, for the reason ReplyForm gives — "Reply" on any comment in a thread has
 * to open one box with that person already @mentioned.
 */
export default function CommentComposer({
  target,
  parentId = null,
  viewer,
  loginNext,
  body,
  onBodyChange,
  onPosted,
  onCancel,
  focusKey = 0,
  autoFocus = false,
  placeholder,
  signedOutPrompt,
}: {
  target: CommentTarget;
  /** null posts a top-level comment; a root comment's id posts a reply to it. */
  parentId?: string | null;
  /** null when signed out — the box then only offers a way in. */
  viewer: ThreadViewer | null;
  loginNext: string;
  body: string;
  onBodyChange: (body: string) => void;
  /** Called after the row lands, so the caller can re-read the discussion. */
  onPosted: () => void | Promise<void>;
  /** Present on a reply box; its absence is what makes this the main composer. */
  onCancel?: () => void;
  focusKey?: number;
  autoFocus?: boolean;
  placeholder: string;
  signedOutPrompt: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!viewer) {
    return (
      // A reply box keeps the indent and the connector even when there is
      // nothing to type in yet, so the invitation sits where the reply would.
      <p className={onCancel ? "reply-row pt-2 text-sm text-muted" : "text-sm text-muted"}>
        <Link
          href={`/login?next=${encodeURIComponent(loginNext)}`}
          className="font-semibold text-accent hover:underline"
        >
          Log in
        </Link>{" "}
        {signedOutPrompt}
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
      setStatus("error");
      setErrorMessage("Your session expired. Reload the page and log in again.");
      return;
    }

    // target_kind/target_slug are sent even for a reply, and the database
    // overwrites them from the parent (normalise_comment_parent). Sending them
    // keeps the NOT NULL columns satisfied without the client having to be
    // trusted about which discussion a reply belongs to.
    const { error } = await supabase.from("comments").insert({
      target_kind: target.kind,
      target_slug: target.slug,
      target_title: target.title,
      parent_id: parentId,
      author_id: user.id,
      body: body.trim(),
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    onBodyChange("");
    setStatus("idle");
    await onPosted();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={onCancel ? "reply-row pt-2" : undefined}
    >
      <div className="flex gap-2">
        <Avatar
          name={viewer.displayName}
          avatar={viewer.avatarUrl}
          size={onCancel ? "sm" : "md"}
        />
        <div className="min-w-0 flex-1">
          <div className="composer-field">
            <MentionTextarea
              required
              autoFocus={autoFocus}
              focusKey={focusKey}
              autoGrow
              dir="auto"
              rows={1}
              value={body}
              onChange={onBodyChange}
              onEnterSubmit={submit}
              placeholder={placeholder}
              aria-label={placeholder}
              textareaClassName="composer-input text-base sm:text-sm"
              mentionButton="icon"
              toolbarClassName="flex items-center justify-end gap-0.5 pb-0.5"
              toolbarExtra={
                <button
                  type="submit"
                  disabled={status === "loading" || !body.trim()}
                  title="Post"
                  aria-label="Post"
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
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-semibold text-muted transition hover:text-fg"
              >
                Cancel
              </button>
            )}
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
