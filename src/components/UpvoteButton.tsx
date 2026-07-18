"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpvoteButton({
  questionId,
  initialUpvoted,
  initialCount,
  isLoggedIn,
  loginNext,
}: {
  questionId: string;
  initialUpvoted: boolean;
  initialCount: number;
  isLoggedIn: boolean;
  loginNext: string;
}) {
  const router = useRouter();
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }
    if (pending) return;
    setPending(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      setPending(false);
      return;
    }

    const nextUpvoted = !upvoted;
    setUpvoted(nextUpvoted);
    setCount((c) => c + (nextUpvoted ? 1 : -1));

    const { error } = nextUpvoted
      ? await supabase.from("question_upvotes").insert({ question_id: questionId, user_id: user.id })
      : await supabase
          .from("question_upvotes")
          .delete()
          .eq("question_id", questionId)
          .eq("user_id", user.id);

    if (error) {
      // Roll back the optimistic update.
      setUpvoted(!nextUpvoted);
      setCount((c) => c - (nextUpvoted ? 1 : -1));
    }
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="btn-ghost"
      data-active={upvoted}
      aria-pressed={upvoted}
    >
      {upvoted ? "✓ Same question here" : "Same question here"}
      <span className="ms-2 font-mono text-xs text-muted">{count}</span>
    </button>
  );
}
