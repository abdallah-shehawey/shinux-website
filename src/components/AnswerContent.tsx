"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";
import { detectDirection } from "@/lib/bidi";
import { relativeTime, fullTimestamp } from "@/lib/time";
import ThreadMenu, { type ThreadMenuItem } from "@/components/ThreadMenu";
import MentionTextarea from "@/components/MentionTextarea";

// One answer as a comment: the author's name and body in a bubble, with the
// time and the Reply action on a quiet row beneath it. The avatar column and
// the reply thread are the parent's (AnswerThread) — this owns the bubble and
// the answer's own edit/delete.
export default function AnswerContent({
  answerId,
  authorId,
  body,
  bodyHtml,
  authorDisplay,
  authorUsername,
  createdAt,
  isAccepted,
  isAdmin,
  currentUserId,
  onReply,
}: {
  answerId: string;
  authorId: string;
  body: string;
  bodyHtml: string;
  authorDisplay: string;
  authorUsername: string | null;
  createdAt: string;
  isAccepted: boolean;
  isAdmin: boolean;
  currentUserId: string | null;
  /** Opens the thread's reply box. Omitted for signed-out readers. */
  onReply?: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bodyValue, setBodyValue] = useState(body);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const canManage = isAdmin || currentUserId === authorId;

  async function handleSave() {
    const trimmed = bodyValue.trim();
    if (!trimmed) {
      setStatus("error");
      setErrorMessage("Answer cannot be empty.");
      return;
    }

    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.from("answers").update({ body: trimmed }).eq("id", answerId);

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("idle");
    setEditing(false);
    await revalidateQuestionCaches();
    router.refresh();
  }

  function handleCancel() {
    setBodyValue(body);
    setErrorMessage("");
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this answer? This can't be undone.")) return;
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.from("answers").delete().eq("id", answerId);
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    await revalidateQuestionCaches();
    router.refresh();
  }

  const menuItems: ThreadMenuItem[] = canManage
    ? [
        { label: "Edit answer", onSelect: () => setEditing(true) },
        { label: "Delete answer", onSelect: handleDelete, tone: "danger" },
      ]
    : [];

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-2"
      >
        <MentionTextarea
          value={bodyValue}
          onChange={setBodyValue}
          dir="auto"
          rows={6}
          autoFocus
          textareaClassName="w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-base sm:text-sm text-fg outline-none focus:border-accent"
        />
        {status === "error" && <p className="text-sm text-red-400">{errorMessage}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={status === "loading"} className="btn-primary">
            {status === "loading" ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={handleCancel} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="bubble-row">
        <div className="bubble">
          <p className="bidi-isolate text-sm font-semibold">
            {authorUsername ? (
              <Link
                href={`/u/${authorUsername}`}
                prefetch={false}
                className="text-fg transition hover:text-accent hover:underline"
              >
                {authorDisplay}
              </Link>
            ) : (
              <span className="text-fg">{authorDisplay}</span>
            )}
            {isAccepted && (
              <span className="ms-2 rounded-full border border-accent px-1.5 py-px align-middle font-mono text-[0.65rem] font-medium text-accent">
                Accepted
              </span>
            )}
          </p>

          {status === "error" && <p className="mt-1 text-sm text-red-400">{errorMessage}</p>}

          <div
            className="prose mt-0.5 max-w-none text-[0.95rem]"
            dir={detectDirection(body)}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>

        <div className="bubble-menu">
          <ThreadMenu items={menuItems} label="Answer options" />
        </div>
      </div>

      <div className="thread-action-row">
        <time
          dateTime={createdAt}
          title={fullTimestamp(createdAt)}
          className="px-1.5 font-mono text-xs text-muted"
        >
          {relativeTime(createdAt)}
        </time>
        {onReply && (
          <button type="button" onClick={onReply} className="thread-action">
            Reply
          </button>
        )}
      </div>
    </>
  );
}
