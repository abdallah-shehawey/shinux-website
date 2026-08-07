"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { notificationLabel, notificationHref, type NotificationRecord } from "@/lib/notification-types";
import { useDismissOnOutsideOrBack } from "@/hooks/useDismissOnOutsideOrBack";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Fallback refresh while the tab is visible, if the live stream is not up. */
const POLL_MS = 45_000;

export default function NotificationsBell({
  initial,
  userId,
}: {
  initial: NotificationRecord[];
  userId: string;
}) {
  const [notifications, setNotifications] = useState(initial);
  // Counted by the database rather than derived from the eight rows above: the
  // badge has to be right even when more than eight are unread, and it has to
  // be able to move without the list being open.
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // `initial` is a server-render snapshot from the root layout, which Next.js
  // does not re-render on client-side navigation — so it can go stale. This
  // reads both the list and the unread count, and is the single thing every
  // trigger below calls.
  //
  // Returns the result instead of setting state itself: each caller applies it
  // behind its own cancellation guard, so a slow response that lands after
  // unmount — or after a newer one — is dropped rather than clobbering fresher
  // data.
  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    const [list, count] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, payload, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
    ]);
    return {
      rows: (list.data as NotificationRecord[] | null) ?? null,
      unread: count.count ?? null,
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    const { rows, unread } = await fetchNotifications();
    if (rows) setNotifications(rows);
    if (unread !== null) setUnreadCount(unread);
  }, [fetchNotifications]);

  // ---- Keeping the badge current ----
  // Three independent triggers, because none of them is reliable alone:
  //
  //   1. The live stream. Only works once `notifications` is in the
  //      supabase_realtime publication (migration 0020) — before that it
  //      connects and silently receives nothing, which is why the other two
  //      exist and why they are NOT conditional on it.
  //   2. Coming back to the tab. The common case by far: the badge is right
  //      the moment you look at it again.
  //   3. A slow poll while the tab is visible, so a tab left open in the
  //      foreground still catches up.
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void refresh();
    };

    run();

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        run,
      )
      .subscribe();

    function onVisibility() {
      if (document.visibilityState === "visible") run();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    // Skipped while the tab is hidden — a background tab does not need a badge,
    // and the visibility handler above refreshes it on the way back in.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // Opening the dropdown still refetches: the list it shows may be older than
  // the count, and this is the moment it is about to be read.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchNotifications().then(({ rows, unread }) => {
      if (cancelled) return;
      if (rows) setNotifications(rows);
      if (unread !== null) setUnreadCount(unread);
    });
    return () => {
      cancelled = true;
    };
  }, [open, fetchNotifications]);

  const dismiss = useDismissOnOutsideOrBack(open, () => setOpen(false), rootRef);

  async function markRead(id: string) {
    // Read from the current render's state, NOT from inside a setState updater:
    // React may run an updater more than once, which would decrement the badge
    // twice for a single click.
    if (notifications.find((n) => n.id === id)?.is_read !== false) return;

    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));

    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    const supabase = createClient();
    // Every unread row of this user's, not just the eight on screen — the badge
    // counts all of them, so "Mark all read" has to clear all of them or it
    // would come straight back on the next refresh.
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted transition hover:border-accent hover:text-fg active:scale-90 sm:h-9 sm:w-9 relative"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-fg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-panel absolute end-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-card p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-accent hover:underline active:opacity-70"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted">No notifications yet.</p>
          ) : (
            <div className="mt-1 flex max-h-96 flex-col gap-1 overflow-y-auto">
              {notifications.map((n) => {
                const href = notificationHref(n);
                const onOpen = () => {
                  dismiss();
                  if (!n.is_read) markRead(n.id);
                };
                const inner = (
                  <div
                    className={`rounded-md px-2 py-2 transition hover:bg-bg active:scale-[0.98] ${!n.is_read ? "bg-bg/60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-fg">{notificationLabel(n)}</p>
                      {!n.is_read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    </div>
                    {n.payload.question_title && (
                      <p className="mt-0.5 truncate text-xs text-muted" dir="auto">
                        {n.payload.question_title}
                      </p>
                    )}
                    <p className="mt-0.5 font-mono text-[10px] text-muted">{formatDate(n.created_at)}</p>
                  </div>
                );
                return href ? (
                  <Link key={n.id} href={href} onClick={onOpen}>
                    {inner}
                  </Link>
                ) : (
                  <button key={n.id} type="button" onClick={onOpen} className="text-start">
                    {inner}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
