// Shared between the server data layer (src/lib/notifications.ts) and client
// components — deliberately has no "server-only" import.
//
// Every type here has a matching subject line in
// supabase/migrations/0018_mentions_and_thread_notifications.sql's
// handle_notification_email(): the in-app label and the email subject are two
// renderings of the same event and must be added in the same change.

export interface NotificationRecord {
  id: string;
  type: string;
  payload: {
    question_id?: string;
    question_slug?: string;
    question_title?: string;
    answer_id?: string;
    reply_id?: string;
    rejection_reason?: string | null;
    /** Display name of whoever mentioned you / posted the reply. */
    actor_name?: string | null;
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
  new_question_published: "A new question was published",
  mention: "Someone mentioned you",
  thread_answer: "New answer on a question you answered",
  thread_reply: "New reply in a discussion you joined",
};

/** Same sentence with a name in front, when the event has one — "Ahmed
 *  mentioned you" reads better than "Someone mentioned you". */
const ACTOR_LABELS: Record<string, (name: string) => string> = {
  mention: (name) => `${name} mentioned you`,
  answer_reply: (name) => `${name} replied to your answer`,
  question_answered: (name) => `${name} answered your question`,
  thread_answer: (name) => `${name} also answered a question you answered`,
  thread_reply: (name) => `${name} replied in a discussion you joined`,
};

export function notificationLabel(n: NotificationRecord | string): string {
  if (typeof n === "string") return LABELS[n] ?? n;

  const actor = n.payload.actor_name?.trim();
  const withActor = actor ? ACTOR_LABELS[n.type]?.(actor) : undefined;
  return withActor ?? LABELS[n.type] ?? n.type;
}

/** Where clicking a notification should go. Admin-review ones have no
 * question_slug yet (unpublished), so they route to the review queue instead. */
export function notificationHref(n: NotificationRecord): string | null {
  if (n.type === "question_submitted") return "/admin/questions";
  return n.payload.question_slug ? `/questions/${n.payload.question_slug}` : null;
}
