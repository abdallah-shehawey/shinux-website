/**
 * Backstop lifetimes for the Next data caches, in seconds.
 *
 * These are NOT the invalidation. Every one of these caches is tagged, and the
 * mutation that changes what it holds busts the tag through one of the
 * revalidate-*.ts server actions — that is what makes an edit show up at once.
 * These numbers only bound how long a write that bypassed the app entirely
 * (an edit made straight in the Supabase dashboard, say) can stay invisible.
 *
 * They live here rather than beside the caches because a window shared by two
 * modules drifts otherwise: QUESTIONS_CACHE_REVALIDATE used to be a private
 * const in questions.ts, so question-order.ts — tagged "questions", busted by
 * the same action — carried its own hardcoded copy and was left behind when the
 * original was raised. Importing it from questions.ts is not an option either:
 * that module pulls in the whole Markdown/Shiki pipeline, which is far too much
 * weight for a file that only wants a number.
 */

/** Q&A: the listing, the tag list, per-author lists, order and every thread. */
export const QUESTIONS_CACHE_REVALIDATE = 3600;

/** Public profiles: /u/[username] and the sitemap's username list. */
export const PROFILES_CACHE_REVALIDATE = 3600;
