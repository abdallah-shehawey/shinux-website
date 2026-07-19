"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "error" | "limited" | "done";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export default function AskForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [tagsInput, setTagsInput] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function showPreview() {
    setMode("preview");
    if (!body.trim()) {
      setPreviewHtml("<p><em>Nothing to preview yet.</em></p>");
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/render-markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      setPreviewHtml(res.ok ? data.html : "<p><em>Preview failed.</em></p>");
    } finally {
      setPreviewLoading(false);
    }
  }

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

    const tags = [
      ...new Set(
        tagsInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 8);

    const { error } = await supabase.from("questions").insert({
      author_id: user.id,
      title: title.trim(),
      body: body.trim(),
      locale,
      is_anonymous: isAnonymous,
      tags,
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
      <div className="card text-center">
        <p className="font-medium text-fg">Your question is under review</p>
        <p className="mt-1 text-sm text-muted">
          An admin will publish it soon — you&apos;ll get a notification either way. You
          can track its status on{" "}
          <a href="/me" className="text-accent hover:underline">
            your account page
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-fg">
          Title
        </label>
        <input
          id="title"
          required
          dir="auto"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A short, specific question"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="body" className="block text-sm font-medium text-fg">
            Details
          </label>
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => setMode("write")}
              className="lang-toggle-btn"
              data-active={mode === "write"}
            >
              Write
            </button>
            <button
              type="button"
              onClick={showPreview}
              className="lang-toggle-btn"
              data-active={mode === "preview"}
            >
              Preview
            </button>
          </div>
        </div>

        {mode === "write" ? (
          <textarea
            id="body"
            required
            dir="auto"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What have you tried? What did you expect vs. what happened? Markdown is supported."
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
          />
        ) : (
          <div className="prose card min-h-40 max-w-none">
            {previewLoading ? (
              <p className="text-sm text-muted">Rendering&hellip;</p>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="locale" className="mb-1.5 block text-sm font-medium text-fg">
            Language
          </label>
          <select
            id="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value as "ar" | "en")}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
          >
            <option value="ar">Arabic</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm font-medium text-fg">
            Tags <span className="text-muted">(comma-separated, optional)</span>
          </label>
          <input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="arch, networking"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="card">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-fg">
            Publish my question as anonymous
            <span className="mt-1 block text-xs text-muted">
              Your name won&apos;t be shown to visitors, but the site admin can still see who
              asked it.
            </span>
          </span>
        </label>
      </div>

      {status === "limited" && (
        <p className="text-sm text-red-400">
          You&apos;ve reached the limit of {RATE_LIMIT} questions per hour. Try again later.
        </p>
      )}
      {status === "error" && <p className="text-sm text-red-400">{errorMessage}</p>}

      <button type="submit" disabled={status === "loading"} className="btn-primary self-start">
        {status === "loading" ? "Submitting…" : "Submit question"}
      </button>
    </form>
  );
}
