"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PLATFORMS = [
  { value: "github", label: "GitHub" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
] as const;

type SocialLink = { platform: string; label: string; url: string };
type Row = SocialLink & { key: string };

function newRow(): Row {
  return { key: crypto.randomUUID(), platform: "github", label: "", url: "" };
}

function isValidUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function SocialLinksForm({
  initialLinks,
}: {
  initialLinks: SocialLink[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    initialLinks.length > 0
      ? initialLinks.map((link) => ({ ...link, key: crypto.randomUUID() }))
      : [],
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "saved">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateRow(key: string, patch: Partial<Row>) {
    setStatus("idle");
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setStatus("idle");
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleaned: SocialLink[] = [];
    for (const row of rows) {
      const url = row.url.trim();
      if (!url) continue; // silently drop empty rows
      if (!isValidUrl(url)) {
        setStatus("error");
        setErrorMessage(`That link for "${row.platform}" doesn't look like a valid URL.`);
        return;
      }
      if (row.platform === "other" && !row.label.trim()) {
        setStatus("error");
        setErrorMessage('Give your "Other" link a name.');
        return;
      }
      cleaned.push({
        platform: row.platform,
        label: row.platform === "other" ? row.label.trim() : "",
        url,
      });
    }

    setStatus("loading");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ social_links: cleaned })
      .eq("id", user.id);

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("saved");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={row.platform}
            onChange={(e) => updateRow(row.key, { platform: e.target.value })}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {row.platform === "other" && (
            <input
              type="text"
              value={row.label}
              onChange={(e) => updateRow(row.key, { label: e.target.value })}
              placeholder="Name"
              maxLength={30}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent sm:w-32"
            />
          )}
          <input
            type="url"
            value={row.url}
            onChange={(e) => updateRow(row.key, { url: e.target.value })}
            placeholder="https://…"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => removeRow(row.key)}
            aria-label="Remove link"
            className="btn-ghost shrink-0"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, newRow()])}
        className="btn-ghost self-start"
      >
        + Add a link
      </button>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={status === "loading"} className="btn-primary">
          {status === "loading" ? "Saving..." : "Save links"}
        </button>
        {status === "error" && <p className="text-sm text-red-400">{errorMessage}</p>}
        {status === "saved" && <p className="text-sm text-accent">Saved.</p>}
      </div>
    </form>
  );
}
