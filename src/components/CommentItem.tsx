"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { detectDirection } from "@/lib/bidi";
import { relativeTime, fullTimestamp } from "@/lib/time";
import { commentAnchorId, type CommentRecord } from "@/lib/comments";
import Avatar from "@/components/Avatar";
import MentionText from "@/components/MentionText";
import ThreadMenu, { type ThreadMenuItem } from "@/components/ThreadMenu";

/**
 * One comment — a root comment or a reply under one, told apart by `variant`.
 *
 * Same shape as the Q&A thread on purpose: avatar, a bubble that hugs its text,
 * and the quiet controls underneath. A reply sits one level in and the
 * connector elbow is drawn by `.reply-row` (globals.css), which is also what
 * fixes its indent to the thread rather than to the language of the message —
 * see ReplyItem for what happens when each message picks its own side.
 *
 * `children` is rendered inside the content column, under the action row: for a
 * root comment that is its replies and their shared reply box, which have to be
 * indented against the comment rather than against the page.
 */
export default function CommentItem({
  comment,
  variant,
  currentUserId,
  isAdmin,
  mentionHandles,
  onReply,
  onDeleted,
  children,
}: {
  comment: CommentRecord;
  variant: "root" | "reply";
  currentUserId: string | null;
  isAdmin: boolean;
  /** Handles in this discussion that resolve to a real account — see MentionText. */
  mentionHandles: string[];
  /** Opens the thread's reply box addressed to this person. */
  onReply?: (handle: string | null) => void;
  onDeleted: (id: string) => void;
  children?: React.ReactNode;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isReply = variant === "reply";
  const authorName = comment.author_display ?? "Deleted user";
  const canDelete = isAdmin || currentUserId === comment.author_id;

  async function handleDelete() {
    const what = isReply ? "reply" : "comment";
    if (!confirm(`Delete this ${what}? This can't be undone.`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("comments").delete().eq("id", comment.id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    // Deleting a root cascades to its replies in the database; the caller drops
    // them from the list the same way.
    onDeleted(comment.id);
  }

  const menuItems: ThreadMenuItem[] = canDelete
    ? [
        {
          label: busy ? "Deleting…" : isReply ? "Delete reply" : "Delete comment",
          onSelect: handleDelete,
          tone: "danger",
        },
      ]
    : [];

  return (
    <div id={commentAnchorId(comment.id)} className={isReply ? "reply-row" : undefined}>
      <div className={`flex ${isReply ? "gap-2" : "gap-2.5"}`}>
        <Avatar
          name={authorName}
          avatar={comment.author_avatar}
          username={comment.author_username}
          size={isReply ? "sm" : "md"}
        />

        <div className="min-w-0 flex-1">
          <div className="bubble-row">
            {/* No dir: a display name is a label the interface writes, so it
                belongs next to the avatar it names rather than at whichever
                edge the message's language would throw it. Only the body below
                follows the language it was written in — see ReplyItem. */}
            <div className={`bubble ${isReply ? "bubble-nested" : ""}`}>
              <p className="bidi-isolate text-sm font-semibold">
                {comment.author_username ? (
                  <Link
                    href={`/u/${comment.author_username}`}
                    prefetch={false}
                    className="text-fg transition hover:text-accent hover:underline"
                  >
                    {authorName}
                  </Link>
                ) : (
                  <span className="text-fg">{authorName}</span>
                )}
              </p>
              {/* detectDirection, not dir="auto": the auto rule takes the first
                  strong character, and every reply now opens with an @mention —
                  a Latin handle — which flipped whole Arabic paragraphs to LTR.
                  detectDirection has the 2:1 dominance override for exactly this
                  (see bidi.ts). */}
              <p
                className="mt-0.5 text-[0.95rem] whitespace-pre-wrap text-fg"
                dir={detectDirection(comment.body)}
              >
                <MentionText text={comment.body} knownHandles={mentionHandles} />
              </p>
            </div>

            <div className="bubble-menu">
              <ThreadMenu items={menuItems} label="Comment options" />
            </div>
          </div>

          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

          <div className="thread-action-row">
            <time
              dateTime={comment.created_at}
              title={fullTimestamp(comment.created_at)}
              className="px-1.5 font-mono text-xs text-muted"
            >
              {relativeTime(comment.created_at)}
            </time>
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(comment.author_username)}
                className="thread-action"
              >
                Reply
              </button>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
