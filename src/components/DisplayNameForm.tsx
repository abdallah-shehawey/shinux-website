"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DisplayNameForm({
  initialDisplayName,
}: {
  initialDisplayName: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialDisplayName);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "saved">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const trimmed = value.trim();
  const unchanged = trimmed === initialDisplayName;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (unchanged) return;

    if (trimmed.length < 1 || trimmed.length > 60) {
      setStatus("error");
      setErrorMessage("1-60 characters.");
      return;
    }

    setStatus("loading");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", user.id);

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setValue(trimmed);
    setStatus("saved");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus("idle");
        }}
        maxLength={60}
        className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={status === "loading" || unchanged}
        className="btn-ghost shrink-0"
      >
        {status === "loading" ? "Saving..." : "Save name"}
      </button>
      {status === "error" && <p className="text-sm text-red-400 sm:ml-2">{errorMessage}</p>}
      {status === "saved" && <p className="text-sm text-accent sm:ml-2">Saved.</p>}
    </form>
  );
}
