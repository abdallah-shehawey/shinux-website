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
  };
  is_read: boolean;
  created_at: string;
}

const LABELS: Record<string, string> = {
  question_published: "Your question was published",
  question_answered: "Your question got a new answer",
  question_rejected: "Your question was not approved",
};

export function notificationLabel(type: string): string {
  return LABELS[type] ?? type;
}
