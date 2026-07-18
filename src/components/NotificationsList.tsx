"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { notificationLabel, notificationHref, type NotificationRecord } from "@/lib/notification-types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function NotificationsList({ initial }: { initial: NotificationRecord[] }) {
  const [notifications, setNotifications] = useState(initial);
  const hasUnread = notifications.some((n) => !n.is_read);

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

  if (notifications.length === 0) {
    return <p className="text-sm text-muted">No notifications yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {hasUnread && (
        <button type="button" onClick={markAllRead} className="self-end text-xs text-accent hover:underline">
          Mark all as read
        </button>
      )}
      <div className="flex flex-col gap-2">
        {notifications.map((n) => {
          const href = notificationHref(n);
          const onOpen = () => {
            if (!n.is_read) markRead(n.id);
          };
          const inner = (
            <div className={`card flex items-center justify-between gap-3 ${href ? "hover:border-accent" : ""}`}>
              <div>
                <p className="text-sm font-medium text-fg">{notificationLabel(n.type)}</p>
                {n.payload.question_title && (
                  <p className="mt-0.5 text-sm text-muted" dir="auto">
                    {n.payload.question_title}
                  </p>
                )}
                <p className="mt-1 font-mono text-xs text-muted">{formatDate(n.created_at)}</p>
              </div>
              {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
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
    </div>
  );
}
