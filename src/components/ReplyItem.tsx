"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";
import AuthorInline from "@/components/AuthorInline";
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
}: {
  reply: ReplyRecord;
  currentUserId: string | null;
  isAdmin: boolean;
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
      <p className="flex items-center gap-2 font-mono text-xs text-muted">
        <AuthorInline
          name={reply.author_display ?? "Deleted user"}
          username={reply.author_username}
          avatar={reply.author_avatar}
        />
        <span>&middot;</span>
        <span>{formatDate(reply.created_at)}</span>
        {canDelete && (
          <>
            <span>&middot;</span>
            <button type="button" onClick={handleDelete} className="hover:text-red-400">
              Delete
            </button>
          </>
        )}
      </p>
      <p className="mt-0.5 text-sm text-fg" dir="auto">
        {reply.body}
      </p>
    </div>
  );
}
