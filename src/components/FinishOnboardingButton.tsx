"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FinishOnboardingButton({ next }: { next: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setLoading(true);
    setFailed(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // Session expired while on this page: send them to sign in again rather
      // than leaving the button stuck on "Saving..." forever.
      router.push(`/login?next=${encodeURIComponent(`/welcome?next=${encodeURIComponent(next)}`)}`);
      return;
    }

    const { error } = await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
    if (error) {
      setLoading(false);
      setFailed(true);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="btn-primary w-full justify-center sm:w-auto"
      >
        {loading ? "Saving..." : "Looks good, continue"}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          Couldn&apos;t save that — please try again.
        </p>
      )}
    </>
  );
}
