"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";
import { detectDirection } from "@/lib/bidi";
import { relativeTime, fullTimestamp } from "@/lib/time";
import Avatar from "@/components/Avatar";
import ThreadMenu, { type ThreadMenuItem } from "@/components/ThreadMenu";
import MentionTextarea from "@/components/MentionTextarea";
import QuestionImages from "@/components/QuestionImages";

// The question itself, laid out as the post at the top of a discussion: who
// asked it and when on one line, the question below, and its actions in a bar
// of their own (see QuestionActions) rather than mixed into the byline.
//
// Admins can edit the title and body in place; the author or an admin can
// delete. The slug is never editable — it is baked into the URL on publish.
export default function QuestionContent({
  questionId,
  authorId,
  title,
  body,
  bodyHtml,
  locale,
  tags,
  images,
  authorDisplay,
  authorUsername,
  authorAvatar,
  createdAt,
  isAdmin,
  currentUserId,
}: {
  questionId: string;
  authorId: string | null;
  title: string;
  body: string;
  bodyHtml: string;
  locale: string;
  tags: string[];
  images: string[];
  authorDisplay: string;
  authorUsername: string | null;
  authorAvatar: string | null;
  createdAt: string;
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [bodyValue, setBodyValue] = useState(body);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const canDelete = isAdmin || (authorId !== null && currentUserId === authorId);

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
    await revalidateQuestionCaches();
    router.refresh();
  }

  function handleCancel() {
    setTitleValue(title);
    setBodyValue(body);
    setErrorMessage("");
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this question? This can't be undone.")) return;
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.from("questions").delete().eq("id", questionId);
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    await revalidateQuestionCaches();
    router.push("/questions");
  }

  const menuItems: ThreadMenuItem[] = [];
  if (isAdmin) menuItems.push({ label: "Edit question", onSelect: () => setEditing(true) });
  if (canDelete)
    menuItems.push({ label: "Delete question", onSelect: handleDelete, tone: "danger" });

  return (
    // The WHOLE post takes the question's direction, not just its text: an
    // Arabic question with an avatar and byline pinned to the left read as a
    // broken layout, because every other Arabic surface starts on the right.
    <article dir={isRtl ? "rtl" : "ltr"} lang={locale}>
      <header className="flex items-center gap-3">
        <Avatar name={authorDisplay} avatar={authorAvatar} username={authorUsername} size="lg" />
        <div className="min-w-0 flex-1">
          {authorUsername ? (
            <Link
              href={`/u/${authorUsername}`}
              prefetch={false}
              className="bidi-isolate block truncate font-semibold text-fg transition hover:text-accent hover:underline"
            >
              {authorDisplay}
            </Link>
          ) : (
            <span className="bidi-isolate block truncate font-semibold text-fg">
              {authorDisplay}
            </span>
          )}
          <p className="flex items-center gap-2 font-mono text-xs text-muted">
            <time dateTime={createdAt} title={fullTimestamp(createdAt)}>
              {relativeTime(createdAt)}
            </time>
            {isRtl && (
              <span className="rounded-full border border-border px-1.5 py-px text-[0.65rem]">
                AR
              </span>
            )}
          </p>
        </div>
        {!editing && <ThreadMenu items={menuItems} label="Question options" />}
      </header>

      {!editing && status === "error" && (
        <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
      )}

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="mt-4 flex flex-col gap-3"
        >
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            dir="auto"
            aria-label="Question title"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-xl font-bold text-fg outline-none focus:border-accent"
          />
          <MentionTextarea
            value={bodyValue}
            onChange={setBodyValue}
            dir="auto"
            rows={8}
            placeholder="Body (Markdown, optional)"
            textareaClassName="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-base sm:text-sm text-fg outline-none focus:border-accent"
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
      ) : (
        <>
          <h1
            className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl"
            dir={detectDirection(title)}
          >
            {title}
          </h1>

          {bodyHtml && (
            <div
              className="prose mt-3 max-w-none"
              style={isRtl ? { fontFamily: "var(--font-ibm-plex-arabic)" } : undefined}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}

          <QuestionImages images={images} />

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/questions?tag=${encodeURIComponent(tag)}`}
                  className="tag-chip"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </article>
  );
}
