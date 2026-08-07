"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import MentionTextarea from "@/components/MentionTextarea";
import type { ThreadViewer } from "@/lib/viewer";

type Status = "idle" | "loading" | "error" | "limited" | "done";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_TAGS = 8;

// Asking a question, shaped like composing a post: who is about to be seen
// asking it at the top, the question itself in the middle with no field
// borders to break it up, and the details that are not the question — language,
// tags — tucked into a footer under a divider.
//
// No Markdown editor and no preview: you type the question the way you would
// type it to a person, and line breaks survive as line breaks (see the
// `breaks` option in markdown.ts).
export default function AskForm({ viewer }: { viewer: ThreadViewer }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [tagsInput, setTagsInput] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // What will actually be stored, shown back as chips while you type — the
  // comma-separated field never made it obvious that "Arch , arch" is one tag.
  const tags = useMemo(
    () => [
      ...new Set(
        tagsInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ],
    [tagsInput],
  );
  const keptTags = tags.slice(0, MAX_TAGS);
  const droppedTags = tags.length - keptTags.length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setStatus("loading");
    setErrorMessage("");
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=/ask");
      return;
    }

    const { count, error: countError } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id)
      .gte("created_at", new Date(Date.now() - RATE_WINDOW_MS).toISOString());

    if (countError) {
      setStatus("error");
      setErrorMessage(countError.message);
      return;
    }
    if ((count ?? 0) >= RATE_LIMIT) {
      setStatus("limited");
      return;
    }

    const { error } = await supabase.from("questions").insert({
      author_id: user.id,
      title: title.trim(),
      body: body.trim(),
      locale,
      is_anonymous: isAnonymous,
      tags: keptTags,
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <span
          className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-fg"
          aria-hidden="true"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m4 12.5 5 5L20 6.5" />
          </svg>
        </span>
        <p className="font-semibold text-fg">Your question is under review</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          An admin will publish it soon — you&apos;ll get a notification either way.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/me" className="btn-primary">
            Track its status
          </Link>
          <Link href="/questions" className="btn-ghost">
            Back to questions
          </Link>
        </div>
      </div>
    );
  }

  const canSubmit = Boolean(title.trim() && body.trim()) && status !== "loading";

  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <Avatar
          name={isAnonymous ? "Anonymous" : viewer.displayName}
          avatar={isAnonymous ? null : viewer.avatarUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg" dir="auto">
            {isAnonymous ? "Anonymous" : viewer.displayName}
          </p>
          {/* The audience control, as a switch rather than a checkbox in a box
              of its own: it changes the name right above it, so it belongs
              next to it. */}
          <button
            type="button"
            onClick={() => setIsAnonymous((v) => !v)}
            aria-pressed={isAnonymous}
            className="tag-chip mt-1"
            data-active={isAnonymous}
          >
            {isAnonymous ? "Hidden name" : "Posting as you"}
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-5">
        <input
          id="title"
          required
          dir="auto"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's your question?"
          aria-label="Question title"
          className="w-full border-none bg-transparent py-1 text-xl font-semibold text-fg outline-none placeholder:text-muted placeholder:font-normal"
        />

        <MentionTextarea
          id="body"
          required
          autoGrow
          dir="auto"
          rows={5}
          value={body}
          onChange={setBody}
          aria-label="Question details"
          placeholder="What have you tried? What did you expect, and what happened instead? Type @ to mention someone."
          textareaClassName="composer-input text-base sm:text-[0.95rem]"
          mentionButton="icon"
          toolbarClassName="flex items-center gap-1 pb-1"
        />
      </div>

      <div className="mt-4 space-y-4 border-t border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-fg">Language</span>
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setLocale("ar")}
              className="lang-toggle-btn"
              data-active={locale === "ar"}
              aria-pressed={locale === "ar"}
            >
              Arabic
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className="lang-toggle-btn"
              data-active={locale === "en"}
              aria-pressed={locale === "en"}
            >
              English
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm font-medium text-fg">
            Tags <span className="font-normal text-muted">(comma-separated, optional)</span>
          </label>
          <input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="arch, networking"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
          />
          {keptTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {keptTags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
              {droppedTags > 0 && (
                <span className="self-center text-xs text-muted">
                  +{droppedTags} over the {MAX_TAGS}-tag limit won&apos;t be saved
                </span>
              )}
            </div>
          )}
        </div>

        {status === "limited" && (
          <p className="text-sm text-red-400">
            You&apos;ve reached the limit of {RATE_LIMIT} questions per hour. Try again later.
          </p>
        )}
        {status === "error" && <p className="text-sm text-red-400">{errorMessage}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Submitting…" : "Post question"}
        </button>
      </div>
    </form>
  );
}
