import "server-only";
import { createClient } from "@/lib/supabase/server";

// ------------------------------------------------------------------------------
// Q&A data layer (Phase 4/5). Mirrors the shape of src/lib/articles.ts for
// style parity, but reads from Supabase instead of the filesystem.
//
// Public reads always go through the `questions_public` / `answers_public`
// views (never the raw tables) — that's where the anonymous-question privacy
// guarantee and the answerer-identity join live. See
// supabase/migrations/0001_init.sql and 0005_multi_answer_and_notifications.sql.
// ------------------------------------------------------------------------------

export interface QuestionSummary {
  id: string;
  title: string;
  locale: "ar" | "en";
  status: "published" | "answered";
  slug: string;
  tags: string[];
  created_at: string;
  is_anonymous: boolean;
  upvote_count: number;
  answer_count: number;
  author_id: string | null;
  author_display: string;
  author_avatar: string | null;
  /** Null when anonymous, same as author_id — never link an anonymous asker. */
  author_username: string | null;
}

export interface QuestionDetail extends QuestionSummary {
  body: string;
}

export interface AnswerRecord {
  id: string;
  question_id: string;
  body: string;
  is_accepted: boolean;
  created_at: string;
  author_id: string;
  author_display: string | null;
  author_avatar: string | null;
  author_username: string | null;
}

/** A user's own question (any status), for /me and rate-limit checks. */
export interface OwnQuestion {
  id: string;
  title: string;
  status: "pending" | "published" | "answered" | "rejected";
  slug: string | null;
  is_anonymous: boolean;
  answer_count: number;
  created_at: string;
}

const SUMMARY_COLUMNS =
  "id, title, locale, status, slug, tags, created_at, is_anonymous, upvote_count, answer_count, author_id, author_display, author_avatar, author_username";

/** Published/answered questions, newest first, with optional search + tag filter. */
export async function getPublicQuestions(opts: {
  search?: string;
  tag?: string;
  limit?: number;
} = {}): Promise<QuestionSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("questions_public")
    .select(SUMMARY_COLUMNS)
    .order("created_at", { ascending: false });

  if (opts.tag) query = query.contains("tags", [opts.tag]);
  if (opts.search) {
    const term = opts.search.replace(/[%_]/g, "").trim();
    if (term) query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  }
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as QuestionSummary[];
}

/** The N newest answered questions (for the homepage). */
export async function getLatestAnsweredQuestions(limit = 3): Promise<QuestionSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions_public")
    .select(SUMMARY_COLUMNS)
    .eq("status", "answered")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as QuestionSummary[];
}

/** Every tag used by a publicly-visible question, sorted. */
export async function getAllQuestionTags(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("questions_public").select("tags");
  if (error) throw error;
  const set = new Set<string>();
  for (const row of data ?? []) {
    for (const tag of (row as { tags: string[] }).tags ?? []) set.add(tag);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** A single published/answered question with its full body. */
export async function getQuestionBySlug(slug: string): Promise<QuestionDetail | null> {
  const supabase = await createClient();
  // Next.js dynamic route params for non-ASCII segments (Arabic slugs) arrive
  // here still percent-encoded rather than decoded — decode defensively so
  // the lookup actually matches. Safe to call unconditionally: a slug with no
  // "%" sequences round-trips through decodeURIComponent unchanged.
  const decoded = decodeURIComponent(slug);
  const { data, error } = await supabase
    .from("questions_public")
    .select(`${SUMMARY_COLUMNS}, body`)
    .eq("slug", decoded)
    .maybeSingle();
  if (error) throw error;
  return (data as QuestionDetail | null) ?? null;
}

/** All answers for a question, oldest first (accepted answer pinned to top). */
export async function getAnswersForQuestion(questionId: string): Promise<AnswerRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("answers_public")
    .select("id, question_id, body, is_accepted, created_at, author_id, author_display, author_avatar, author_username")
    .eq("question_id", questionId)
    .order("is_accepted", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnswerRecord[];
}

/**
 * A user's own published/answered questions, for their public profile page.
 * Naturally excludes anonymous questions of theirs — questions_public nulls
 * author_id for those, so they never match `.eq("author_id", authorId)`.
 */
export async function getQuestionsByAuthor(authorId: string): Promise<QuestionSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions_public")
    .select(SUMMARY_COLUMNS)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuestionSummary[];
}

export interface AnswerWithQuestion extends AnswerRecord {
  question_title: string;
  question_slug: string;
}

/** A user's public answers, with the parent question's title/slug for linking. */
export async function getAnswersByAuthor(authorId: string): Promise<AnswerWithQuestion[]> {
  const supabase = await createClient();
  const { data: answers, error } = await supabase
    .from("answers_public")
    .select("id, question_id, body, is_accepted, created_at, author_id, author_display, author_avatar, author_username")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!answers || answers.length === 0) return [];

  const questionIds = [...new Set(answers.map((a) => a.question_id))];
  const { data: questions, error: qError } = await supabase
    .from("questions_public")
    .select("id, title, slug")
    .in("id", questionIds);
  if (qError) throw qError;

  const bySlug = new Map((questions ?? []).map((q) => [q.id, q]));
  return (answers as AnswerRecord[])
    .map((a) => {
      const q = bySlug.get(a.question_id);
      return q ? { ...a, question_title: q.title, question_slug: q.slug } : null;
    })
    .filter((a): a is AnswerWithQuestion => a !== null);
}

export interface ReplyRecord {
  id: string;
  answer_id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_display: string | null;
  author_avatar: string | null;
  author_username: string | null;
}

/** Lightweight replies to a single answer, oldest first. */
export async function getRepliesForAnswer(answerId: string): Promise<ReplyRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("answer_replies_public")
    .select("id, answer_id, body, created_at, author_id, author_display, author_avatar, author_username")
    .eq("answer_id", answerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReplyRecord[];
}

/** Whether a given user has already upvoted a question. */
export async function hasUserUpvoted(questionId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_upvotes")
    .select("question_id")
    .eq("question_id", questionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** A signed-in user's own questions, any status, newest first (for /me). */
export async function getOwnQuestions(userId: string): Promise<OwnQuestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .select("id, title, status, slug, is_anonymous, answer_count, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OwnQuestion[];
}

/** A pending question with its (real, non-anonymized) author profile joined in. */
export interface PendingQuestion {
  id: string;
  title: string;
  body: string;
  locale: string;
  is_anonymous: boolean;
  tags: string[];
  created_at: string;
  author_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

/** Pending questions for the admin review queue, newest first. */
export async function getPendingQuestions(): Promise<PendingQuestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, title, body, locale, is_anonymous, tags, created_at, author_id, profiles:author_id (username, display_name, avatar_url)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  // PostgREST embeds a many-to-one relation (questions.author_id -> profiles.id)
  // as a single object at runtime; without generated DB types the client's
  // static type widens it to an array, so it's cast back here.
  return (data ?? []) as unknown as PendingQuestion[];
}
