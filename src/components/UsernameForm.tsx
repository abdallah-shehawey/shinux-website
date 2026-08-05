"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completeUsernameRename } from "@/lib/username-rename";

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;

function normalize(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function UsernameForm({ initialUsername }: { initialUsername: string }) {
  const router = useRouter();
  // The handle currently on the account. Tracked in state, not read off the
  // prop, so a second save in the same session compares against what was just
  // written instead of the value /me was rendered with.
  const [current, setCurrent] = useState(initialUsername);
  const [value, setValue] = useState(initialUsername);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "saved">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const normalized = normalize(value);
  const unchanged = normalized === current;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (unchanged) return;

    if (!USERNAME_PATTERN.test(normalized)) {
      setStatus("error");
      setErrorMessage("3-30 characters: lowercase letters, numbers, _ or -.");
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
      .update({ username: normalized })
      .eq("id", user.id);

    if (error) {
      setStatus("error");
      setErrorMessage(
        error.code === "23505"
          ? "That username is already taken — try another one."
          : error.message,
      );
      return;
    }

    // Awaited, not fired and forgotten: this is what turns /u/<previous> into a
    // 404 and publishes /u/<normalized>, and router.refresh() below must not
    // run before it lands. A failure here is not a failed rename — the row is
    // already written — so the caches just fall back to expiring on their own.
    await completeUsernameRename().catch(() => {});

    setCurrent(normalized);
    setValue(normalized);
    setStatus("saved");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm focus-within:border-accent">
          <span className="text-muted">@</span>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setStatus("idle");
            }}
            maxLength={30}
            className="w-full bg-transparent text-base sm:text-sm text-fg outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || unchanged}
          className="btn-ghost shrink-0"
        >
          {status === "loading" ? "Saving..." : "Save username"}
        </button>
        {status === "error" && <p className="text-sm text-red-400 sm:ms-2">{errorMessage}</p>}
      </div>

      {/* Just the outcome. What a rename does to the old handle and to already
          published work is mechanics the person renaming did not ask about. */}
      {status === "saved" && <p className="text-sm text-accent">Username updated.</p>}
    </form>
  );
}
