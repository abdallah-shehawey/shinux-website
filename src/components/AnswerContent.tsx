"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";
import { detectDirection } from "@/lib/bidi";
import AuthorInline from "@/components/AuthorInline";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Owns an answer's byline and body, plus the owner-or-admin edit/delete toggle for the body.
export default function AnswerContent({
  answerId,
  authorId,
  body,
  bodyHtml,
  authorDisplay,
  authorUsername,
  authorAvatar,
  createdAt,
  isAdmin,
  currentUserId,
}: {
  answerId: string;
  authorId: string;
  body: string;
  bodyHtml: string;
  authorDisplay: string;
  authorUsername: string | null;
  authorAvatar: string | null;
  createdAt: string;
  isAdmin: boolean;
  currentUserId: string | null;
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

  return (
    <div>
      <p className="mb-3 flex items-center gap-2 font-mono text-xs text-muted">
        <AuthorInline name={authorDisplay} username={authorUsername} avatar={authorAvatar} />
        <span>&middot;</span>
        <span>{formatDate(createdAt)}</span>
        {canManage && !editing && (
          <>
            <span>&middot;</span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="hover:text-accent active:opacity-60"
            >
              Edit
            </button>
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

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-3"
        >
          <textarea
            value={bodyValue}
            onChange={(e) => setBodyValue(e.target.value)}
            dir="auto"
            rows={6}
            className="rounded-lg border border-border bg-bg px-3 py-2 font-mono text-base sm:text-sm text-fg outline-none focus:border-accent"
          />
          {status === "error" && <p className="text-sm text-red-400">{errorMessage}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={status === "loading"} className="btn-ghost">
              {status === "loading" ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={handleCancel} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {status === "error" && <p className="mb-2 text-sm text-red-400">{errorMessage}</p>}
          <div
            className="prose max-w-none"
            dir={detectDirection(body)}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </>
      )}
    </div>
  );
}
