// Shared between the server data layer (src/lib/notifications.ts) and client
// components — deliberately has no "server-only" import.

export interface NotificationRecord {
  id: string;
  type: string;
  payload: {
    question_id?: string;
    question_slug?: string;
    question_title?: string;
    answer_id?: string;
    reply_id?: string;
  };
  is_read: boolean;
  created_at: string;
}

const LABELS: Record<string, string> = {
  question_published: "Your question was published",
  question_answered: "Your question got a new answer",
  question_rejected: "Your question was not approved",
  question_submitted: "A new question needs review",
  answer_reply: "Someone replied to your answer",
};

export function notificationLabel(type: string): string {
  return LABELS[type] ?? type;
}

/** Where clicking a notification should go. Admin-review ones have no
 * question_slug yet (unpublished), so they route to the review queue instead. */
export function notificationHref(n: NotificationRecord): string | null {
  if (n.type === "question_submitted") return "/admin/questions";
  return n.payload.question_slug ? `/questions/${n.payload.question_slug}` : null;
}
