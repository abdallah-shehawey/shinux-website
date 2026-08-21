"use client";

import { useState } from "react";
import CommentItem from "@/components/CommentItem";
import CommentComposer from "@/components/CommentComposer";
import type { CommentRecord, CommentTarget } from "@/lib/comments";
import type { ThreadViewer } from "@/lib/viewer";

/** Replies shown before "View N previous replies" is offered. */
const COLLAPSE_AFTER = 3;

/**
 * One comment and everything hanging off it: its replies, and the single reply
 * box they all share.
 *
 * The box's open state and draft live here so "Reply" — on the comment or on
 * any one of its replies — opens the same box with that person already
 * @mentioned. The @mention is the whole reason a flat list of replies still
 * reads as a conversation: the database only keeps one level of nesting (see
 * normalise_comment_parent), so who is answering whom is carried by the text.
 */
export default function CommentThread({
  comment,
  replies,
  target,
  viewer,
  loginNext,
  isAdmin,
  mentionHandles,
  onPosted,
  onDeleted,
}: {
  comment: CommentRecord;
  replies: CommentRecord[];
  target: CommentTarget;
  viewer: ThreadViewer | null;
  loginNext: string;
  isAdmin: boolean;
  mentionHandles: string[];
  onPosted: () => void | Promise<void>;
  onDeleted: (id: string) => void;
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

  // Appended rather than replacing the draft, so addressing a second person
  // adds them instead of throwing away what was typed. Nobody is @mentioned in
  // their own thread, and a profile without a handle has nothing to address.
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
    <CommentItem
      comment={comment}
      variant="root"
      currentUserId={viewer?.id ?? null}
      isAdmin={isAdmin}
      mentionHandles={mentionHandles}
      onReply={startReply}
      onDeleted={onDeleted}
    >
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
            <CommentItem
              key={reply.id}
              comment={reply}
              variant="reply"
              currentUserId={viewer?.id ?? null}
              isAdmin={isAdmin}
              mentionHandles={mentionHandles}
              onReply={startReply}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}

      {open && (
        <CommentComposer
          target={target}
          parentId={comment.id}
          viewer={viewer}
          loginNext={loginNext}
          body={body}
          onBodyChange={setBody}
          focusKey={focusKey}
          autoFocus
          onCancel={() => setOpen(false)}
          onPosted={async () => {
            setOpen(false);
            await onPosted();
          }}
          placeholder="Write a reply… @ to mention someone"
          signedOutPrompt="to reply."
        />
      )}
    </CommentItem>
  );
}
