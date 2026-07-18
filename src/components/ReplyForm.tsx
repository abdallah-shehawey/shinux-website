"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ReplyForm({
  answerId,
  isLoggedIn,
  loginNext,
}: {
  answerId: string;
  isLoggedIn: boolean;
  loginNext: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted hover:text-accent"
      >
        Reply
      </button>
    );
  }

  if (!isLoggedIn) {
    return (
      <p className="text-xs text-muted">
        <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="text-accent hover:underline">
          Log in
        </Link>{" "}
        to reply.
      </p>
    );
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
      .from("answer_replies")
      .insert({ answer_id: answerId, author_id: user.id, body: body.trim() });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setBody("");
    setOpen(false);
    setStatus("idle");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <textarea
        required
        dir="auto"
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Reply…"
        className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
      />
      {status === "error" && <p className="text-xs text-red-400">{errorMessage}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={status === "loading"} className="btn-ghost px-3 py-1 text-xs">
          {status === "loading" ? "Posting…" : "Post reply"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1 text-xs text-muted hover:text-fg"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
