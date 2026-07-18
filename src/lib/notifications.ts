import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRecord } from "@/lib/notification-types";

export type { NotificationRecord } from "@/lib/notification-types";
export { notificationLabel } from "@/lib/notification-types";

/** A user's own notifications, newest first (RLS restricts this to their own). */
export async function getUserNotifications(
  userId: string,
  limit = 20,
): Promise<NotificationRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, payload, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NotificationRecord[];
}
