"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { notificationLabel, notificationHref, type NotificationRecord } from "@/lib/notification-types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsBell({ initial }: { initial: NotificationRecord[] }) {
  const [notifications, setNotifications] = useState(initial);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
        className="btn-ghost relative px-2.5"
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
        <div className="absolute end-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-accent hover:underline">
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
                  setOpen(false);
                  if (!n.is_read) markRead(n.id);
                };
                const inner = (
                  <div
                    className={`rounded-md px-2 py-2 transition-colors hover:bg-bg ${!n.is_read ? "bg-bg/60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-fg">{notificationLabel(n.type)}</p>
                      {!n.is_read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    </div>
                    {n.payload.question_title && (
                      <p className="mt-0.5 truncate text-xs text-muted">{n.payload.question_title}</p>
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
