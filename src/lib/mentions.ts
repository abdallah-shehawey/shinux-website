// ------------------------------------------------------------------------------
// @mentions — the one place the syntax is defined.
//
// Deliberately dependency-free and NOT "server-only": the same rules have to
// hold in three places that can never drift apart, or a mention would render as
// a link without notifying anybody (or the reverse):
//
//   1. the Markdown pipeline (src/lib/markdown.ts) turning @handle into a link,
//   2. the plain-text reply renderer (src/components/MentionText.tsx),
//   3. supabase/migrations/0018_mentions_and_thread_notifications.sql, whose
//      extract_mentions() is the Postgres translation of MENTION_PATTERN and
//      must be edited in lockstep with it.
//
// A handle matches profiles.username: 3-30 chars of [a-z0-9_-], see
// UsernameForm's USERNAME_PATTERN.
// ------------------------------------------------------------------------------

/**
 * `@handle`, but only where an `@` really starts one.
 *
 * Group 1 is the character before the `@` (empty at the start of the string) and
 * is matched rather than looked behind so this works in every JS engine and can
 * be mirrored by Postgres' POSIX regex. Group 2 is the handle itself.
 *
 * The excluded lead characters are what stop false positives:
 *   - letters/digits/`_`/`-` → an email address (`someone@example.com`)
 *   - `@`                    → a doubled `@@handle`
 *   - `/`                    → a URL path segment (`github.com/@handle`)
 */
export const MENTION_PATTERN = /(^|[^A-Za-z0-9_@/-])@([A-Za-z0-9_-]{3,30})/g;

/** Every distinct handle mentioned in `text`, lowercased. Order-preserving. */
export function extractMentions(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION_PATTERN)) {
    found.add(match[2].toLowerCase());
  }
  return [...found];
}

/** Characters a handle is made of. Same alphabet as MENTION_PATTERN's group 2. */
const HANDLE_CHAR = /[A-Za-z0-9_-]/;
const MAX_HANDLE = 30;

/**
 * The `@query` being typed at `caret`, or null if the caret is not inside one —
 * this is what decides whether the suggestion list opens (MentionTextarea).
 *
 * Walks back from the caret over handle characters to an `@`, then applies
 * exactly the lead-character rule MENTION_PATTERN does, so the list never opens
 * on something that would not have been linked anyway: an email address, a
 * doubled `@@`, a URL path.
 */
export function findActiveMention(
  value: string,
  caret: number,
): { start: number; query: string } | null {
  let i = caret;
  while (i > 0 && HANDLE_CHAR.test(value[i - 1])) i--;
  if (i === 0 || value[i - 1] !== "@") return null;

  const at = i - 1;
  const before = at > 0 ? value[at - 1] : "";
  if (before && (HANDLE_CHAR.test(before) || before === "@" || before === "/")) return null;

  const query = value.slice(i, caret);
  if (query.length > MAX_HANDLE) return null;
  return { start: at, query };
}

export type MentionSegment =
  | { type: "text"; value: string }
  | { type: "mention"; handle: string };

/**
 * Split plain text into literal runs and mentions, keeping only handles that
 * belong to a real account — an unknown `@handle` stays plain text rather than
 * becoming a link to a profile that does not exist.
 *
 * Used for bodies that are NOT Markdown-rendered (replies). Markdown bodies go
 * through remarkMentions in src/lib/markdown.ts instead, which does the same
 * job on the syntax tree so code blocks and existing links are left alone.
 */
export function splitMentions(text: string, knownHandles: Iterable<string>): MentionSegment[] {
  const known = knownHandles instanceof Set ? knownHandles : new Set(knownHandles);
  const segments: MentionSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(MENTION_PATTERN)) {
    const handle = match[2].toLowerCase();
    if (!known.has(handle)) continue;

    // match.index points at the lead character (group 1), not at the "@".
    const at = match.index + match[1].length;
    if (at > cursor) segments.push({ type: "text", value: text.slice(cursor, at) });
    segments.push({ type: "mention", handle });
    cursor = at + 1 + match[2].length;
  }

  if (cursor < text.length) segments.push({ type: "text", value: text.slice(cursor) });
  return segments;
}
