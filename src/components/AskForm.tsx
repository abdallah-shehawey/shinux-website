"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { detectDirection } from "@/lib/bidi";
import Avatar from "@/components/Avatar";
import MentionTextarea from "@/components/MentionTextarea";
import type { ThreadViewer } from "@/lib/viewer";

type Status = "idle" | "loading" | "error" | "limited" | "done";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_TAGS = 8;
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
/** Postgres "column does not exist" — see the insert below. */
const UNDEFINED_COLUMN = "42703";

// Asking a question, shaped like composing a post: who is about to be seen
// asking it at the top, the question itself in the middle with no field
// borders to break it up, photos under it, and the details that are not the
// question — tags — tucked into a footer under a divider.
//
// No Markdown editor and no preview: you type the question the way you would
// type it to a person, and line breaks survive as line breaks (see the
// `breaks` option in markdown.ts). The question's language is not asked for
// either — it is read off what was typed, on submit.
export default function AskForm({ viewer }: { viewer: ThreadViewer }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  // Photos are uploaded as they are picked, so what is held here is already a
  // public URL — the question row just records the list. `path` is kept beside
  // it so removing one before posting can delete the file rather than orphan it.
  const [images, setImages] = useState<{ url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(0);

  // What will actually be stored, shown back as chips while you type — the
  // comma-separated field never made it obvious that "Arch , arch" is one tag.
  const tags = useMemo(
    () => [
      ...new Set(
        tagsInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ],
    [tagsInput],
  );
  const keptTags = tags.slice(0, MAX_TAGS);
  const droppedTags = tags.length - keptTags.length;

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    // Cleared immediately so picking the SAME file again still fires a change.
    e.target.value = "";
    if (picked.length === 0) return;

    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setErrorMessage(`You can attach up to ${MAX_IMAGES} photos.`);
      return;
    }

    const accepted: File[] = [];
    let rejected = "";
    for (const file of picked.slice(0, room)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        rejected = "Use PNG, JPEG, WebP or GIF images.";
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        rejected = "Each photo must be under 5MB.";
        continue;
      }
      accepted.push(file);
    }
    setErrorMessage(rejected);
    if (accepted.length === 0) return;

    setUploading((n) => n + accepted.length);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(0);
      router.push("/login?next=/ask");
      return;
    }

    // Uploaded in parallel; each lands in the picker's own order as it
    // finishes, and one failure does not take the others down with it.
    await Promise.all(
      accepted.map(async (file) => {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage
          .from("question-images")
          .upload(path, file, { contentType: file.type });

        if (error) {
          setErrorMessage(error.message);
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("question-images").getPublicUrl(path);
          setImages((current) => [...current, { url: publicUrl, path }]);
        }
        setUploading((n) => n - 1);
      }),
    );
  }

  async function removeImage(path: string) {
    setImages((current) => current.filter((image) => image.path !== path));
    // Fire-and-forget: the photo is already gone from the draft, and a failed
    // delete leaves a stray file rather than a broken question.
    const supabase = createClient();
    void supabase.storage.from("question-images").remove([path]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setStatus("loading");
    setErrorMessage("");
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=/ask");
      return;
    }

    const { count, error: countError } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id)
      .gte("created_at", new Date(Date.now() - RATE_WINDOW_MS).toISOString());

    if (countError) {
      setStatus("error");
      setErrorMessage(countError.message);
      return;
    }
    if ((count ?? 0) >= RATE_LIMIT) {
      setStatus("limited");
      return;
    }

    // `locale` still drives which way the published question lays out and
    // which font it renders in, but nobody should have to declare it: it is
    // read off what was actually typed, with the same detector the answers and
    // replies already use.
    const locale = detectDirection(`${title}\n${body}`) === "rtl" ? "ar" : "en";

    const row = {
      author_id: user.id,
      title: title.trim(),
      body: body.trim(),
      locale,
      is_anonymous: isAnonymous,
      tags: keptTags,
    };

    let { error } = await supabase
      .from("questions")
      .insert({ ...row, images: images.map((image) => image.url) });

    // The `images` column ships with migration 0019. Until that SQL is run,
    // posting a question must still work — it just cannot carry photos, so it
    // is retried without them rather than failing in the asker's face.
    if (error?.code === UNDEFINED_COLUMN) {
      ({ error } = await supabase.from("questions").insert(row));
    }

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <span
          className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-fg"
          aria-hidden="true"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m4 12.5 5 5L20 6.5" />
          </svg>
        </span>
        <p className="font-semibold text-fg">Your question is under review</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          An admin will publish it soon — you&apos;ll get a notification either way.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/me" className="btn-primary">
            Track its status
          </Link>
          <Link href="/questions" className="btn-ghost">
            Back to questions
          </Link>
        </div>
      </div>
    );
  }

  // Submitting mid-upload would store a question missing the photos still in
  // flight, so the button waits for them.
  const canSubmit =
    Boolean(title.trim() && body.trim()) && status !== "loading" && uploading === 0;

  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <Avatar
          name={isAnonymous ? "Anonymous" : viewer.displayName}
          avatar={isAnonymous ? null : viewer.avatarUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg" dir="auto">
            {isAnonymous ? "Anonymous" : viewer.displayName}
          </p>
          {/* The audience control, as a switch rather than a checkbox in a box
              of its own: it changes the name right above it, so it belongs
              next to it. */}
          <button
            type="button"
            onClick={() => setIsAnonymous((v) => !v)}
            aria-pressed={isAnonymous}
            className="tag-chip mt-1"
            data-active={isAnonymous}
          >
            {isAnonymous ? "Hidden name" : "Posting as you"}
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-5">
        <input
          id="title"
          required
          dir="auto"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's your question?"
          aria-label="Question title"
          className="w-full border-none bg-transparent py-1 text-xl font-semibold text-fg outline-none placeholder:text-muted placeholder:font-normal"
        />

        <MentionTextarea
          id="body"
          required
          autoGrow
          dir="auto"
          rows={5}
          value={body}
          onChange={setBody}
          aria-label="Question details"
          placeholder="What have you tried? What did you expect, and what happened instead? Type @ to mention someone."
          textareaClassName="composer-input text-base sm:text-[0.95rem]"
          mentionButton="icon"
          toolbarClassName="flex items-center gap-1 pb-1"
          toolbarExtra={
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= MAX_IMAGES}
              title="Add photos"
              aria-label="Add photos"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-bg hover:text-accent active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="8.5" cy="9.5" r="1.5" />
                <path d="m21 16-5-5L5 20" />
              </svg>
            </button>
          }
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={onPickImages}
          className="hidden"
        />

        {(images.length > 0 || uploading > 0) && (
          // dir="ltr": the strip runs in upload order, which has nothing to do
          // with the language the question is written in.
          <div dir="ltr" className="mt-2 flex flex-wrap gap-2 pb-2">
            {images.map((image) => (
              <div key={image.path} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="h-full w-full rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.path)}
                  aria-label="Remove photo"
                  className="absolute -end-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg text-xs text-muted transition hover:text-red-400 active:scale-90"
                >
                  ✕
                </button>
              </div>
            ))}
            {Array.from({ length: uploading }).map((_, i) => (
              <div
                key={`uploading-${i}`}
                className="h-20 w-20 animate-pulse rounded-lg border border-border skeleton-bar"
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-4 border-t border-border p-4 sm:p-5">
        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm font-medium text-fg">
            Tags <span className="font-normal text-muted">(comma-separated, optional)</span>
          </label>
          <input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="arch, networking"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-base sm:text-sm text-fg outline-none focus:border-accent"
          />
          {keptTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {keptTags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
              {droppedTags > 0 && (
                <span className="self-center text-xs text-muted">
                  +{droppedTags} over the {MAX_TAGS}-tag limit won&apos;t be saved
                </span>
              )}
            </div>
          )}
        </div>

        {status === "limited" && (
          <p className="text-sm text-red-400">
            You&apos;ve reached the limit of {RATE_LIMIT} questions per hour. Try again later.
          </p>
        )}
        {/* Not gated on status === "error": a rejected photo has to report
            itself while the form is still perfectly submittable. */}
        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading"
            ? "Submitting…"
            : uploading > 0
              ? "Uploading photos…"
              : "Post question"}
        </button>
      </div>
    </form>
  );
}
