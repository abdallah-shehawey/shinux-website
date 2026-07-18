"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";

export default function AnswerForm({
  questionId,
  isLoggedIn,
  loginNext,
}: {
  questionId: string;
  isLoggedIn: boolean;
  loginNext: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isLoggedIn) {
    return (
      <div className="card text-center">
        <p className="text-sm text-muted">
          <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="text-accent hover:underline">
            Log in
          </Link>{" "}
          to post an answer.
        </p>
      </div>
    );
  }

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
    if (!body.trim()) return;
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }

    const { error } = await supabase
      .from("answers")
      .insert({ question_id: questionId, author_id: user.id, body: body.trim() });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setBody("");
    setMode("write");
    setStatus("idle");
    // Bust the cached thread BEFORE refreshing, or the refresh re-serves it.
    await revalidateQuestionCaches();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-fg">Your answer</p>
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
          required
          dir="auto"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share what worked for you. Markdown is supported."
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
      ) : (
        <div className="prose card min-h-32 max-w-none">
          {previewLoading ? (
            <p className="text-sm text-muted">Rendering&hellip;</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          )}
        </div>
      )}

      {status === "error" && <p className="text-sm text-red-400">{errorMessage}</p>}

      <button type="submit" disabled={status === "loading"} className="btn-primary self-start">
        {status === "loading" ? "Posting…" : "Post answer"}
      </button>
    </form>
  );
}
