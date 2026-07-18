"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthorInline from "@/components/AuthorInline";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Owns the question's byline, title and body, plus the admin-only edit toggle
// for both (slug is never editable — it's baked into the URL on publish).
export default function QuestionContent({
  questionId,
  title,
  body,
  bodyHtml,
  locale,
  tags,
  authorDisplay,
  authorUsername,
  authorAvatar,
  createdAt,
  isAdmin,
}: {
  questionId: string;
  title: string;
  body: string;
  bodyHtml: string;
  locale: string;
  tags: string[];
  authorDisplay: string;
  authorUsername: string | null;
  authorAvatar: string | null;
  createdAt: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [bodyValue, setBodyValue] = useState(body);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isRtl = locale === "ar";

  async function handleSave() {
    const trimmedTitle = titleValue.trim();
    if (!trimmedTitle) {
      setStatus("error");
      setErrorMessage("Title cannot be empty.");
      return;
    }

    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase
      .from("questions")
      .update({ title: trimmedTitle, body: bodyValue.trim() })
      .eq("id", questionId);

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
    setTitleValue(title);
    setBodyValue(body);
    setErrorMessage("");
    setEditing(false);
  }

  return (
    <div>
      <div className="mt-4 mb-2 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
        <AuthorInline name={authorDisplay} username={authorUsername} avatar={authorAvatar} />
        <span>&middot;</span>
        <span>{formatDate(createdAt)}</span>
        {locale === "ar" && <span className="tag-chip">AR</span>}
        {isAdmin && !editing && (
          <>
            <span>&middot;</span>
            <button type="button" onClick={() => setEditing(true)} className="hover:text-accent">
              Edit
            </button>
          </>
        )}
      </div>

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="mb-6 flex flex-col gap-3"
        >
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            dir="auto"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-xl font-bold text-fg outline-none focus:border-accent"
          />
          <textarea
            value={bodyValue}
            onChange={(e) => setBodyValue(e.target.value)}
            dir="auto"
            rows={8}
            placeholder="Body (Markdown, optional)"
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
        <>
          <h1 className="mb-4 text-3xl font-bold tracking-tight" dir="auto" lang={locale}>
            {title}
          </h1>

          {tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Link key={tag} href={`/questions?tag=${encodeURIComponent(tag)}`} className="tag-chip">
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {bodyHtml && (
            <div
              className="prose max-w-none"
              dir={isRtl ? "rtl" : "ltr"}
              lang={locale}
              style={isRtl ? { fontFamily: "var(--font-ibm-plex-arabic)" } : undefined}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
        </>
      )}
    </div>
  );
}
