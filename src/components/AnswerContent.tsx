"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { detectDirection } from "@/lib/bidi";
import AuthorInline from "@/components/AuthorInline";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Owns an answer's byline and body, plus the admin-only edit toggle for the body.
export default function AnswerContent({
  answerId,
  body,
  bodyHtml,
  authorDisplay,
  authorUsername,
  authorAvatar,
  createdAt,
  isAdmin,
}: {
  answerId: string;
  body: string;
  bodyHtml: string;
  authorDisplay: string;
  authorUsername: string | null;
  authorAvatar: string | null;
  createdAt: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bodyValue, setBodyValue] = useState(body);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
    router.refresh();
  }

  function handleCancel() {
    setBodyValue(body);
    setErrorMessage("");
    setEditing(false);
  }

  return (
    <div>
      <p className="mb-3 flex items-center gap-2 font-mono text-xs text-muted">
        <AuthorInline name={authorDisplay} username={authorUsername} avatar={authorAvatar} />
        <span>&middot;</span>
        <span>{formatDate(createdAt)}</span>
        {isAdmin && !editing && (
          <>
            <span>&middot;</span>
            <button type="button" onClick={() => setEditing(true)} className="hover:text-accent">
              Edit
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
            className="rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
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
        <div
          className="prose max-w-none"
          dir={detectDirection(body)}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}
    </div>
  );
}
