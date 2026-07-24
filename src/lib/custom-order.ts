/**
 * Shared merge rule for the admin's drag-to-reorder tables (article_order,
 * tutorial_track_order): anything WITHOUT a row goes first — new content that
 * hasn't been placed yet, keeping the order it already had (date-desc for
 * articles, frontmatter order for tracks) — then the explicitly-ordered items
 * by position ascending.
 *
 * New-content-first is deliberate (379f09d): freshly published work surfaces on
 * the home page without the admin having to re-drag the whole list, and the
 * curated block stays put underneath. Flipping these two back would silently
 * bury every new article until it was manually positioned.
 *
 * Lives on its own rather than inside article-order.ts because more than one
 * content type now shares it.
 */
export function applyCustomOrder<T extends { slug: string }>(
  items: T[],
  order: Record<string, number>,
): T[] {
  const ordered = items.filter((a) => order[a.slug] !== undefined);
  const rest = items.filter((a) => order[a.slug] === undefined);
  ordered.sort((a, b) => order[a.slug] - order[b.slug]);
  return [...rest, ...ordered];
}

/** The same merge rule for questions, which are keyed by id rather than slug.
 *  Kept here, next to applyCustomOrder and clear of question-order.ts's
 *  `server-only` guard, because /questions now applies the order in the
 *  browser — that page is prerendered, so tag filtering happens client-side. */
export function applyQuestionOrder<T extends { id: string }>(
  questions: T[],
  order: Record<string, number>,
): T[] {
  const ordered = questions.filter((q) => order[q.id] !== undefined);
  const rest = questions.filter((q) => order[q.id] === undefined);
  ordered.sort((a, b) => order[a.id] - order[b.id]);
  return [...rest, ...ordered];
}
