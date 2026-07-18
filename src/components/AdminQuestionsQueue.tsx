"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { revalidateQuestionCaches } from "@/lib/revalidate-questions";
import { slugify } from "@/lib/slug";

export interface PendingQuestion {
  id: string;
  title: string;
  body: string;
  locale: string;
  is_anonymous: boolean;
  tags: string[];
  created_at: string;
  author_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function uniqueSlugFor(title: string): Promise<string> {
  const supabase = createClient();
  const base = slugify(title);
  let candidate = base;
  let suffix = 1;
  // Admin has SELECT on every question row (RLS: questions_select_own_or_admin).
  for (;;) {
    const { data, error } = await supabase
      .from("questions")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error || !data) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export default function AdminQuestionsQueue({ initial }: { initial: PendingQuestion[] }) {
  const [queue, setQueue] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function publish(question: PendingQuestion) {
    setBusyId(question.id);
    setErrorMessage("");
    const supabase = createClient();
    const slug = await uniqueSlugFor(question.title);
    const { error } = await supabase
      .from("questions")
      .update({ status: "published", slug, published_at: new Date().toISOString() })
      .eq("id", question.id);
    setBusyId(null);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    void revalidateQuestionCaches();
    setQueue((prev) => prev.filter((q) => q.id !== question.id));
  }

  async function reject(question: PendingQuestion) {
    setBusyId(question.id);
    setErrorMessage("");
    const supabase = createClient();
    const { error } = await supabase
      .from("questions")
      .update({ status: "rejected" })
      .eq("id", question.id);
    setBusyId(null);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    void revalidateQuestionCaches();
    setQueue((prev) => prev.filter((q) => q.id !== question.id));
  }

  if (queue.length === 0) {
    return <p className="text-sm text-muted">No pending questions right now.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
      {queue.map((q) => {
        const authorName = q.profiles?.display_name || q.profiles?.username || "Unknown user";
        return (
          <div key={q.id} className="card">
            <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
              <span>By {authorName}</span>
              {q.is_anonymous && (
                <span className="tag-chip" title="Will be published as anonymous">
                  🕶️ anonymous
                </span>
              )}
              <span>&middot;</span>
              <span>{formatDate(q.created_at)}</span>
              {q.locale === "ar" && <span className="tag-chip">AR</span>}
            </div>
            <h3 className="mb-1 text-lg font-semibold text-fg" dir="auto" lang={q.locale}>
              {q.title}
            </h3>
            <p
              className="mb-3 whitespace-pre-wrap text-sm text-muted"
              dir="auto"
              lang={q.locale}
            >
              {q.body}
            </p>
            {q.tags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {q.tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => publish(q)}
                disabled={busyId === q.id}
                className="btn-primary"
              >
                Publish
              </button>
              <button
                type="button"
                onClick={() => reject(q)}
                disabled={busyId === q.id}
                className="btn-ghost"
              >
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
