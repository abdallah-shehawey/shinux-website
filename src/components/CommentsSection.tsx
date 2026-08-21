"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/use-session";
import { extractMentions } from "@/lib/mentions";
import {
  groupComments,
  type CommentRecord,
  type CommentTarget,
  type CommentTargetKind,
} from "@/lib/comments";
import CommentThread from "@/components/CommentThread";
import CommentComposer from "@/components/CommentComposer";
import type { ThreadViewer } from "@/lib/viewer";

/**
 * Comments under an article, a tutorial track or a lesson.
 *
 * Loads in the browser rather than on the server, which is what keeps every one
 * of those pages statically prerendered — see the note at the top of
 * src/lib/comments.ts. The section reserves no fixed height: it is below the
 * article, past the author card and the prev/next links, so nothing the reader
 * is looking at moves when the discussion lands.
 */

/** Enough that no real discussion here is ever cut off, low enough to be a cap. */
const MAX_COMMENTS = 300;

const COLUMNS =
  "id, target_kind, target_slug, parent_id, body, created_at, author_id, author_display, author_avatar, author_username";

export default function CommentsSection({
  kind,
  slug,
  title,
}: {
  kind: CommentTargetKind;
  slug: string;
  title: string;
}) {
  const session = useSession();
  const pathname = usePathname();
  const [rows, setRows] = useState<CommentRecord[] | null>(null);
  const [mentionHandles, setMentionHandles] = useState<string[]>([]);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState<ThreadViewer | null>(null);
  const [draft, setDraft] = useState("");
  // A #comment-<id> link is only worth following once, and only if the comment
  // it names actually arrived.
  const jumped = useRef(false);

  const target: CommentTarget = useMemo(() => ({ kind, slug, title }), [kind, slug, title]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments_public")
      .select(COLUMNS)
      .eq("target_kind", kind)
      .eq("target_slug", slug)
      .order("created_at", { ascending: true })
      .limit(MAX_COMMENTS);

    if (error) {
      // The reader gets a sentence; the reason goes to the console, where it is
      // of use to whoever can do something about it. A Postgres error in the
      // middle of an article reads as the site being broken.
      console.warn("[comments] load failed:", error.message);
      setLoadError("The discussion could not be loaded. Try reloading the page.");
      setRows([]);
      return;
    }

    const comments = (data ?? []) as CommentRecord[];
    setLoadError("");
    setRows(comments);

    // Which @handles in this discussion belong to real accounts — the same
    // allow-list resolveMentionHandles builds on the server for a question, so
    // a typo'd handle stays plain text instead of linking into nowhere.
    const wanted = [...new Set(comments.flatMap((c) => extractMentions(c.body)))];
    if (wanted.length === 0) {
      setMentionHandles([]);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles_public")
      .select("username")
      .in("username", wanted);
    setMentionHandles((profiles ?? []).map((p) => p.username as string));
  }, [kind, slug]);

  useEffect(() => {
    let cancelled = false;
    // Behind a closure, and re-checked on the way in, so a discussion that is
    // still loading when the reader moves on cannot land on the next page's
    // section.
    const run = () => {
      if (!cancelled) void load();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // The signed-in reader, as the composer needs them: enough to draw their
  // avatar next to the box. The auth user carries neither a display name nor an
  // avatar — both live on the profile.
  useEffect(() => {
    const user = session?.user ?? null;
    if (!user) return;
    let alive = true;
    const run = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user.id)
        .single();
      if (!alive) return;
      setProfile({
        id: user.id,
        displayName: data?.display_name?.trim() || data?.username || "You",
        username: data?.username ?? null,
        avatarUrl: data?.avatar_url ?? null,
      });
    };
    void run();
    return () => {
      alive = false;
    };
  }, [session?.user]);

  // Derived rather than cleared in the effect above: signing out has to take
  // the composer's avatar with it in the same render, and a profile left over
  // from the previous account would otherwise draw somebody else's face on the
  // box until a fetch replaced it.
  const viewer =
    session?.user != null && profile?.id === session.user.id ? profile : null;

  // Arriving from a notification: land on the comment it was about. The browser
  // cannot do this itself — the element did not exist when the page loaded.
  useEffect(() => {
    if (jumped.current || rows === null) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#comment-")) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    jumped.current = true;
    el.scrollIntoView({ block: "center" });
    el.classList.add("comment-flash");
  }, [rows]);

  function handleDeleted(id: string) {
    // Deleting a root cascades in the database; mirror that here rather than
    // re-reading the whole discussion for one removal.
    setRows((current) =>
      current === null ? current : current.filter((c) => c.id !== id && c.parent_id !== id),
    );
  }

  const { roots, repliesByRoot } = useMemo(
    () => groupComments(rows ?? []),
    [rows],
  );
  const total = rows?.length ?? 0;

  return (
    <section id="comments" className="mt-12 border-t border-border pt-8">
      <h2 className="text-lg font-semibold">
        Comments
        {rows !== null && total > 0 && <span className="ml-2 font-mono text-sm text-muted">{total}</span>}
      </h2>

      {rows === null ? (
        <p className="mt-4 text-sm text-muted">Loading the discussion…</p>
      ) : (
        <>
          {loadError !== "" && (
            <p className="mt-4 text-sm text-red-400">{loadError}</p>
          )}

          {roots.length > 0 && (
            <div className="mt-5 flex flex-col gap-5">
              {roots.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  replies={repliesByRoot.get(comment.id) ?? []}
                  target={target}
                  viewer={viewer}
                  loginNext={pathname}
                  isAdmin={session?.isAdmin ?? false}
                  mentionHandles={mentionHandles}
                  onPosted={load}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}

          {roots.length === 0 && loadError === "" && (
            <p className="mt-4 text-sm text-muted">
              Nothing here yet. Say the first thing.
            </p>
          )}

          <div className="mt-6">
            <CommentComposer
              target={target}
              viewer={viewer}
              loginNext={pathname}
              body={draft}
              onBodyChange={setDraft}
              onPosted={load}
              placeholder="Write a comment… @ to mention someone"
              signedOutPrompt="to join the discussion."
            />
          </div>
        </>
      )}
    </section>
  );
}
