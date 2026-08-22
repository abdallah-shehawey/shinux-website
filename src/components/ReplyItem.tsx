"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";
import { detectDirection } from "@/lib/bidi";
import { relativeTime, fullTimestamp } from "@/lib/time";
import Avatar from "@/components/Avatar";
import MentionText from "@/components/MentionText";
import ThreadMenu, { type ThreadMenuItem } from "@/components/ThreadMenu";
import type { ReplyRecord } from "@/lib/questions";

// A reply, one level in from the answer it belongs to. The connector elbow on
// the left is drawn by .reply-row in globals.css.
export default function ReplyItem({
  reply,
  currentUserId,
  isAdmin,
  mentionHandles,
  onReply,
}: {
  reply: ReplyRecord;
  currentUserId: string | null;
  isAdmin: boolean;
  /** Handles in this thread that resolve to a real account — see MentionText. */
  mentionHandles: string[];
  /** Opens the thread's reply box pre-addressed to this person. Omitted for
   *  signed-out readers, who have nothing to open. */
  onReply?: (handle: string | null) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const canDelete = isAdmin || currentUserId === reply.author_id;
  const authorName = reply.author_display ?? "Deleted user";

  async function handleDelete() {
    if (!confirm("Delete this reply? This can't be undone.")) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("answer_replies")
      .delete()
      .eq("id", reply.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await revalidateQuestionCaches();
    router.refresh();
  }

  const menuItems: ThreadMenuItem[] = canDelete
    ? [{ label: "Delete reply", onSelect: handleDelete, tone: "danger" }]
    : [];

  return (
    // No dir of its own: the ROW belongs to the answer it hangs off, and takes
    // that thread's direction. Giving each reply its own flipped the avatar and
    // the connector elbow to the other side whenever somebody answered in the
    // other language, so an Arabic answer with an English reply under it drew
    // the reply on the opposite edge of the column, attached to nothing — a
    // thread that zig-zagged instead of nesting. Only the bubble below reads
    // its own text; where the reply SITS is a property of the conversation.
    <div className="reply-row">
      <div className="flex gap-2">
        <Avatar
          name={authorName}
          avatar={reply.author_avatar}
          username={reply.author_username}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="bubble-row">
            {/* No dir here either. A display name is a label the interface
                writes, not part of the message, so it belongs next to the
                avatar it names — turning the whole bubble over sent it to the
                far edge, a hand's width from the face it goes with. Only the
                body below follows the language it was written in, which is
                what every chat app does: the name at the bubble's start,
                Arabic text right-aligned inside it. */}
            <div className="bubble bubble-nested">
              <p className="bidi-isolate text-sm font-semibold">
                {reply.author_username ? (
                  <Link
                    href={`/u/${reply.author_username}`}
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
                dir={detectDirection(reply.body)}
              >
                <MentionText text={reply.body} knownHandles={mentionHandles} />
              </p>
            </div>

            <div className="bubble-menu">
              <ThreadMenu items={menuItems} label="Reply options" />
            </div>
          </div>

          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

          <div className="thread-action-row">
            <time
              dateTime={reply.created_at}
              title={fullTimestamp(reply.created_at)}
              className="px-1.5 font-mono text-xs text-muted"
            >
              {relativeTime(reply.created_at)}
            </time>
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(reply.author_username)}
                className="thread-action"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
