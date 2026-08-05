"use client";

import { useState } from "react";
import ReplyItem from "@/components/ReplyItem";
import ReplyForm from "@/components/ReplyForm";
import type { ReplyRecord } from "@/lib/questions";

/**
 * One answer's comment thread: the replies, plus the single reply box they all
 * share. It owns the box's open state and draft so "Reply" on an individual
 * comment can open it with that person already @mentioned.
 */
export default function AnswerReplies({
  answerId,
  replies,
  isLoggedIn,
  loginNext,
  currentUserId,
  isAdmin,
  mentionHandles,
}: {
  answerId: string;
  replies: ReplyRecord[];
  isLoggedIn: boolean;
  loginNext: string;
  currentUserId: string | null;
  isAdmin: boolean;
  mentionHandles: string[];
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");

  // A reply already addressed to someone. The mention is appended rather than
  // replacing the draft, so clicking Reply on a second person adds them instead
  // of throwing away what was typed. An anonymous asker has no handle to
  // address (username is null) — the box still opens, just empty.
  function startReply(handle: string | null) {
    setOpen(true);
    if (!handle) return;
    setBody((current) => {
      if (current.includes(`@${handle}`)) return current;
      return current ? `${current.trimEnd()} @${handle} ` : `@${handle} `;
    });
  }

  return (
    <>
      {replies.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              mentionHandles={mentionHandles}
              onReply={isLoggedIn ? startReply : undefined}
            />
          ))}
        </div>
      )}
      <ReplyForm
        answerId={answerId}
        isLoggedIn={isLoggedIn}
        loginNext={loginNext}
        open={open}
        onOpenChange={setOpen}
        body={body}
        onBodyChange={setBody}
      />
    </>
  );
}
