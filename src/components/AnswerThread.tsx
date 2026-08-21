"use client";

import { useState } from "react";
import { detectDirection } from "@/lib/bidi";
import Avatar from "@/components/Avatar";
import AnswerContent from "@/components/AnswerContent";
import ReplyItem from "@/components/ReplyItem";
import ReplyForm from "@/components/ReplyForm";
import type { AnswerWithHtml, ReplyRecord } from "@/lib/questions";
import type { ThreadViewer } from "@/lib/viewer";

/** Replies shown before "View N previous replies" is offered. */
const COLLAPSE_AFTER = 3;

/**
 * One answer and everything hanging off it: the author's avatar column, the
 * answer bubble, its replies, and the single reply box they all share.
 *
 * The box's open state and draft live here so that "Reply" — on the answer or
 * on any one of its replies — opens the same box, with that person already
 * @mentioned when the reply came from an individual comment.
 */
export default function AnswerThread({
  answer,
  replies,
  viewer,
  loginNext,
  isAdmin,
  mentionHandles,
}: {
  answer: AnswerWithHtml;
  replies: ReplyRecord[];
  viewer: ThreadViewer | null;
  loginNext: string;
  isAdmin: boolean;
  mentionHandles: string[];
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [expanded, setExpanded] = useState(false);
  // Bumped by every Reply click so the composer takes focus again even when it
  // was already open — see MentionTextarea's focusKey.
  const [focusKey, setFocusKey] = useState(0);

  // Long threads open on their tail — the newest replies are the ones being
  // read, and the rest stay one click away.
  const hidden = expanded ? 0 : Math.max(0, replies.length - COLLAPSE_AFTER);
  const visible = hidden > 0 ? replies.slice(hidden) : replies;

  // Every Reply button addresses somebody: the one under the answer names its
  // author, the one under a reply names whoever wrote that reply. Facebook's
  // behaviour, and the reason a reply reads as coming *from* the comment above
  // it rather than as another message in a flat list.
  //
  // The mention is appended rather than replacing the draft, so clicking Reply
  // on a second person adds them instead of throwing away what was typed.
  // Skipped in two cases: an anonymous asker has no handle to address
  // (username is null), and nobody needs to be @mentioned in their own thread.
  function startReply(handle: string | null) {
    setOpen(true);
    setFocusKey((n) => n + 1);
    if (!handle || handle === viewer?.username) return;
    setBody((current) => {
      if (current.includes(`@${handle}`)) return current;
      return current ? `${current.trimEnd()} @${handle} ` : `@${handle} `;
    });
  }

  return (
    // Each answer carries its own direction — an Arabic answer under an English
    // question (or the reverse) gets its avatar, bubble and connectors on the
    // side that its text actually starts from.
    <div dir={detectDirection(answer.body)} className="flex gap-2.5">
      <Avatar
        name={answer.author_display ?? "Deleted user"}
        avatar={answer.author_avatar}
        username={answer.author_username}
        size="md"
      />

      <div className="min-w-0 flex-1">
        <AnswerContent
          answerId={answer.id}
          authorId={answer.author_id}
          body={answer.body}
          bodyHtml={answer.html}
          authorDisplay={answer.author_display ?? "Deleted user"}
          authorUsername={answer.author_username}
          createdAt={answer.created_at}
          isAccepted={answer.is_accepted}
          isAdmin={isAdmin}
          currentUserId={viewer?.id ?? null}
          onReply={() => startReply(answer.author_username)}
        />

        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="reply-row pt-1 text-start text-xs font-semibold text-muted transition hover:text-accent"
          >
            View {hidden} previous {hidden === 1 ? "reply" : "replies"}
          </button>
        )}

        {visible.length > 0 && (
          <div className="mt-1 flex flex-col gap-2">
            {visible.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                currentUserId={viewer?.id ?? null}
                isAdmin={isAdmin}
                mentionHandles={mentionHandles}
                onReply={startReply}
              />
            ))}
          </div>
        )}

        <ReplyForm
          answerId={answer.id}
          viewer={viewer}
          loginNext={loginNext}
          open={open}
          onOpenChange={setOpen}
          body={body}
          onBodyChange={setBody}
          focusKey={focusKey}
        />
      </div>
    </div>
  );
}
