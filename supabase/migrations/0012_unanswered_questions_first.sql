-- ==============================================================================
-- linux-blog — unanswered questions sort ahead of answered ones on the public
-- Q&A listing, so a freshly-asked (still-unanswered) question stays visible
-- above older questions that already got answered, instead of being buried by
-- the plain sort_at-only ordering.
-- ==============================================================================

-- Rebuild questions_public (append-only rule: `create or replace view` cannot
-- reorder or rename existing columns, only append new ones at the very end —
-- the full existing column list, in order, is: id, title, body, locale,
-- status, slug, tags, created_at, is_anonymous, author_id, author_display,
-- author_avatar, upvote_count, answer_count, author_username, published_at,
-- sort_at (0001 + 0005's counters + 0008's author_username + 0011's
-- published_at/sort_at). is_answered goes after all of it.
--
-- is_answered is an explicit boolean rather than sorting by `status` text
-- directly — relying on 'published' < 'answered' alphabetically would be a
-- non-obvious accident of the two status strings, not a real ordering rule.
create or replace view public.questions_public
with (security_invoker = off) as
select
  q.id, q.title, q.body, q.locale, q.status, q.slug, q.tags, q.created_at,
  q.is_anonymous,
  case when q.is_anonymous then null else q.author_id end as author_id,
  case when q.is_anonymous then 'Anonymous user' else p.display_name end as author_display,
  case when q.is_anonymous then null else p.avatar_url end as author_avatar,
  q.upvote_count, q.answer_count,
  case when q.is_anonymous then null else p.username end as author_username,
  q.published_at,
  coalesce(q.published_at, q.created_at) as sort_at,
  (q.status = 'answered') as is_answered
from public.questions q
join public.profiles p on p.id = q.author_id
where q.status in ('published', 'answered');

grant select on public.questions_public to anon, authenticated;
