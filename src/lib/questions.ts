import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { renderMarkdown } from "@/lib/markdown";

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
  /** When the question was actually approved (null for legacy rows published before this column existed). */
  published_at: string | null;
  /** coalesce(published_at, created_at) — what the public listing sorts by, so a freshly-approved question jumps to the top. */
  sort_at: string;
  /** status === "answered", exposed as a real boolean so the listing can sort unanswered questions first. */
  is_answered: boolean;
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
  "id, title, locale, status, slug, tags, created_at, is_anonymous, upvote_count, answer_count, author_id, author_display, author_avatar, author_username, published_at, sort_at, is_answered";

const ANSWER_COLUMNS =
  "id, question_id, body, is_accepted, created_at, author_id, author_display, author_avatar, author_username";

const REPLY_COLUMNS =
  "id, answer_id, body, created_at, author_id, author_display, author_avatar, author_username";

// Everything under the "questions" cache tag is public-view data fetched with
// the cookie-free anon client, stored in the Next data cache. Mutations bust
// the tag via revalidateQuestionCaches(); `revalidate` is only a backstop for
// writes that bypass the app (e.g. edits straight in the Supabase dashboard).
const QUESTIONS_CACHE_REVALIDATE = 300;

/** Published/answered questions — unanswered ones first, newest first within
 *  each group — with optional search + tag filter. */
export async function getPublicQuestions(opts: {
  search?: string;
  tag?: string;
  limit?: number;
} = {}): Promise<QuestionSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("questions_public")
    .select(SUMMARY_COLUMNS)
    .order("is_answered", { ascending: true })
    .order("sort_at", { ascending: false });

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

/**
 * Cached variant of the default (no-search) questions listing, for the index
 * page. Search results stay on the live getPublicQuestions() path — arbitrary
 * search terms would mint unbounded cache entries.
 */
export const getCachedPublicQuestions = unstable_cache(
  async (tag?: string): Promise<QuestionSummary[]> => {
    const supabase = createAnonClient();
    let query = supabase
      .from("questions_public")
      .select(SUMMARY_COLUMNS)
      .order("is_answered", { ascending: true })
      .order("sort_at", { ascending: false });
    if (tag) query = query.contains("tags", [tag]);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as QuestionSummary[];
  },
  ["questions-list"],
  { revalidate: QUESTIONS_CACHE_REVALIDATE, tags: ["questions"] },
);

/** The N newest answered questions (for the homepage), from the data cache. */
export const getLatestAnsweredQuestions = unstable_cache(
  async (limit = 3): Promise<QuestionSummary[]> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("questions_public")
      .select(SUMMARY_COLUMNS)
      .eq("status", "answered")
      .order("sort_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as QuestionSummary[];
  },
  ["questions-latest"],
  { revalidate: QUESTIONS_CACHE_REVALIDATE, tags: ["questions"] },
);

/** Every tag used by a publicly-visible question, sorted. From the data cache. */
export const getAllQuestionTags = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase.from("questions_public").select("tags");
    if (error) throw error;
    const set = new Set<string>();
    for (const row of data ?? []) {
      for (const tag of (row as { tags: string[] }).tags ?? []) set.add(tag);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  },
  ["questions-tags"],
  { revalidate: QUESTIONS_CACHE_REVALIDATE, tags: ["questions"] },
);

/**
 * A single published/answered question with its full body. Wrapped in React
 * cache() so generateMetadata and the page share ONE query per request.
 */
export const getQuestionBySlug = cache(async (slug: string): Promise<QuestionDetail | null> => {
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
});

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

/**
 * Replies for MANY answers in one query, grouped by answer id — the question
 * page loads a whole thread with a single round trip instead of one per
 * answer. Answers with no replies simply have no map entry.
 */
export async function getRepliesForAnswers(
  answerIds: string[],
): Promise<Map<string, ReplyRecord[]>> {
  const grouped = new Map<string, ReplyRecord[]>();
  if (answerIds.length === 0) return grouped;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("answer_replies_public")
    .select("id, answer_id, body, created_at, author_id, author_display, author_avatar, author_username")
    .in("answer_id", answerIds)
    .order("created_at", { ascending: true });
  if (error) throw error;

  for (const reply of (data ?? []) as ReplyRecord[]) {
    const list = grouped.get(reply.answer_id);
    if (list) list.push(reply);
    else grouped.set(reply.answer_id, [reply]);
  }
  return grouped;
}

export interface AnswerWithHtml extends AnswerRecord {
  /** The answer body pre-rendered to sanitized HTML. */
  html: string;
}

export interface QuestionThread {
  question: QuestionDetail;
  questionHtml: string;
  answers: AnswerWithHtml[];
  /** Replies grouped by answer id — a plain object (not a Map) because this
   *  whole payload is JSON-serialized into the Next data cache. */
  repliesByAnswer: Record<string, ReplyRecord[]>;
}

// The full public thread, fetched with the anon client (no cookies — required
// inside unstable_cache) and with every Markdown body already rendered, so a
// cache hit serves the page with zero Supabase round trips and zero Shiki work.
async function fetchQuestionThread(slug: string): Promise<QuestionThread | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("questions_public")
    .select(`${SUMMARY_COLUMNS}, body`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  const question = (data as QuestionDetail | null) ?? null;
  if (!question) return null;

  const [{ html: questionHtml }, rawAnswers] = await Promise.all([
    renderMarkdown(question.body),
    supabase
      .from("answers_public")
      .select(ANSWER_COLUMNS)
      .eq("question_id", question.id)
      .order("is_accepted", { ascending: false })
      .order("created_at", { ascending: true })
      .then(({ data: rows, error: err }) => {
        if (err) throw err;
        return (rows ?? []) as AnswerRecord[];
      }),
  ]);

  const [answers, repliesByAnswer] = await Promise.all([
    Promise.all(
      rawAnswers.map(async (a) => ({ ...a, html: (await renderMarkdown(a.body)).html })),
    ),
    (async (): Promise<Record<string, ReplyRecord[]>> => {
      const grouped: Record<string, ReplyRecord[]> = {};
      if (rawAnswers.length === 0) return grouped;
      const { data: rows, error: err } = await supabase
        .from("answer_replies_public")
        .select(REPLY_COLUMNS)
        .in("answer_id", rawAnswers.map((a) => a.id))
        .order("created_at", { ascending: true });
      if (err) throw err;
      for (const reply of (rows ?? []) as ReplyRecord[]) {
        (grouped[reply.answer_id] ??= []).push(reply);
      }
      return grouped;
    })(),
  ]);

  return { question, questionHtml, answers, repliesByAnswer };
}

/**
 * The question page's data, served from the Next data cache: anonymous
 * readers open a question without touching Supabase or the Markdown pipeline
 * after the first visit. Wrapped in React cache() so generateMetadata and the
 * page body share one lookup per request. Invalidated by
 * revalidateQuestionCaches() after every Q&A mutation.
 */
export const getQuestionThread = cache((slug: string): Promise<QuestionThread | null> => {
  // Non-ASCII (Arabic) slugs arrive percent-encoded from the router — decode
  // BEFORE keying the cache so both spellings share one entry.
  const decoded = decodeURIComponent(slug);
  return unstable_cache(
    () => fetchQuestionThread(decoded),
    ["question-thread", decoded],
    {
      revalidate: QUESTIONS_CACHE_REVALIDATE,
      tags: ["questions", `question:${decoded}`],
    },
  )();
});

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
