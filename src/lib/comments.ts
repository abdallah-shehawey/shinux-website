// ------------------------------------------------------------------------------
// Comments on the parts of the site that are not questions: articles, tutorial
// tracks, and the lessons inside them.
//
// Deliberately not "server-only". The whole feature runs in the browser, and
// that is a decision worth writing down: every article, track and lesson page
// is statically prerendered, and the reason they are fast (and free to serve)
// is that rendering one costs no function invocation and reads nothing
// request-specific. Fetching the discussion on the server would drag all of
// them into dynamic rendering for the sake of a section below the fold. So the
// page ships as a static document, and the comments arrive from Supabase after
// it paints, under RLS, exactly as the notification bell already does.
//
// The trade-off is honest: comments are not in the HTML, so they are not
// indexed and they cost one round trip to appear. On a personal blog neither
// matters as much as the whole site staying static.
//
// The schema is supabase/migrations/0023_content_comments.sql.
// ------------------------------------------------------------------------------

/** What a comment can be attached to. Matches the CHECK constraint on the table. */
export type CommentTargetKind = "article" | "tutorial" | "lesson";

/**
 * The piece of content a discussion belongs to.
 *
 * `slug` is the content's own address, the same one the URL uses: an article
 * slug, a track slug, or `track/lesson` for a lesson. `title` rides along so a
 * notification can say what was commented on — the database has no way to read
 * content/.
 */
export interface CommentTarget {
  kind: CommentTargetKind;
  slug: string;
  title: string;
}

/** A row of comments_public: a comment plus who wrote it. */
export interface CommentRecord {
  id: string;
  target_kind: CommentTargetKind;
  target_slug: string;
  /** null for a top-level comment, otherwise the ROOT of its thread — the
   *  database flattens deeper nesting, see normalise_comment_parent(). */
  parent_id: string | null;
  body: string;
  created_at: string;
  author_id: string;
  author_display: string | null;
  author_avatar: string | null;
  author_username: string | null;
}

/** Where a discussion lives, as a path. The SQL mirror is comment_target_path(). */
export function commentTargetPath(kind: CommentTargetKind, slug: string): string {
  return kind === "article" ? `/articles/${slug}` : `/tutorials/${slug}`;
}

/** The dom id of one comment — what a `#comment-<id>` link scrolls to. */
export function commentAnchorId(id: string): string {
  return `comment-${id}`;
}

/**
 * Split a flat list into root comments and the replies under each, both in the
 * order they were written.
 *
 * The query asks for one target's comments in one go rather than for roots and
 * then replies: a discussion is small, and two round trips to draw one section
 * would show it half-built.
 */
export function groupComments(rows: CommentRecord[]): {
  roots: CommentRecord[];
  repliesByRoot: Map<string, CommentRecord[]>;
} {
  const roots: CommentRecord[] = [];
  const repliesByRoot = new Map<string, CommentRecord[]>();

  for (const row of rows) {
    if (row.parent_id === null) {
      roots.push(row);
      continue;
    }
    const bucket = repliesByRoot.get(row.parent_id);
    if (bucket) bucket.push(row);
    else repliesByRoot.set(row.parent_id, [row]);
  }

  return { roots, repliesByRoot };
}
