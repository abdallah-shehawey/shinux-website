"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FinishOnboardingButton({ next }: { next: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
    router.push(next);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="btn-primary w-full justify-center sm:w-auto"
    >
      {loading ? "Saving..." : "Looks good, continue"}
    </button>
  );
}
