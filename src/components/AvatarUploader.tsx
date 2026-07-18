"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function AvatarUploader({
  avatarUrl,
  initial,
}: {
  avatarUrl: string | null;
  initial: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(avatarUrl);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus("error");
      setErrorMessage("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("error");
      setErrorMessage("Image must be under 2MB.");
      return;
    }

    setStatus("loading");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const path = `${user.id}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setStatus("error");
      setErrorMessage(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust: the object path never changes on re-upload, so without this
    // the browser (and any CDN edge cache) would keep showing the old image.
    const bustedUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: bustedUrl })
      .eq("id", user.id);

    if (updateError) {
      setStatus("error");
      setErrorMessage(updateError.message);
      return;
    }

    setPreview(bustedUrl);
    setStatus("idle");
    router.refresh();
  }

  async function onRemove() {
    setStatus("loading");
    setErrorMessage("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Actually delete the stored file (not just the profile's reference to
    // it) so removing a photo frees the space instead of leaving it orphaned.
    const { error: removeError } = await supabase.storage
      .from("avatars")
      .remove([`${user.id}/avatar`]);
    if (removeError) {
      setStatus("error");
      setErrorMessage(removeError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);
    if (updateError) {
      setStatus("error");
      setErrorMessage(updateError.message);
      return;
    }

    setPreview(null);
    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-mono text-xl font-bold text-accent-fg">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={initial} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === "loading"}
            className="btn-ghost"
          >
            {status === "loading" ? "Uploading..." : "Change photo"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={onRemove}
              disabled={status === "loading"}
              className="btn-ghost"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFileChange}
          className="hidden"
        />
        {status === "error" && (
          <p className="mt-1 text-sm text-red-400">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
