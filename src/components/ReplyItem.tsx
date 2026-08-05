"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";
import AuthorInline from "@/components/AuthorInline";
import MentionText from "@/components/MentionText";
import type { ReplyRecord } from "@/lib/questions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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
  const canDelete = isAdmin || currentUserId === reply.author_id;

  async function handleDelete() {
    if (!confirm("Delete this reply? This can't be undone.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("answer_replies").delete().eq("id", reply.id);
    if (error) {
      alert(error.message);
      return;
    }
    await revalidateQuestionCaches();
    router.refresh();
  }

  return (
    <div className="ps-3" style={{ borderInlineStart: "2px solid var(--border)" }}>
      <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
        <AuthorInline
          name={reply.author_display ?? "Deleted user"}
          username={reply.author_username}
          avatar={reply.author_avatar}
        />
        <span>&middot;</span>
        <span>{formatDate(reply.created_at)}</span>
        {onReply && (
          <>
            <span>&middot;</span>
            <button
              type="button"
              onClick={() => onReply(reply.author_username)}
              className="hover:text-accent active:opacity-60"
            >
              Reply
            </button>
          </>
        )}
        {canDelete && (
          <>
            <span>&middot;</span>
            <button
              type="button"
              onClick={handleDelete}
              className="hover:text-red-400 active:opacity-60"
            >
              Delete
            </button>
          </>
        )}
      </p>
      <p className="mt-0.5 text-sm text-fg whitespace-pre-wrap" dir="auto">
        <MentionText text={reply.body} knownHandles={mentionHandles} />
      </p>
    </div>
  );
}
