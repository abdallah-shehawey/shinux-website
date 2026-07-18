-- ==============================================================================
-- linux-blog — public user profiles (/u/[username]) + linkable question authors
-- ------------------------------------------------------------------------------
-- Answers were already fully public (answers_public exposes every answerer's
-- identity — no anonymity option there). This just extends the same idea:
-- a non-anonymous question's author becomes clickable too, and any user gets
-- a minimal public profile page listing their (non-anonymous) questions and
-- answers, so "Written by" / a Q&A byline can link somewhere real.
-- ==============================================================================

-- Add author_username to questions_public — appended at the end, same
-- "create or replace view can only append columns" constraint as 0005.
-- Null exactly when the question is anonymous, same as author_id/author_avatar.
create or replace view public.questions_public
with (security_invoker = off) as
select
  q.id, q.title, q.body, q.locale, q.status, q.slug, q.tags, q.created_at,
  q.is_anonymous,
  case when q.is_anonymous then null else q.author_id end as author_id,
  case when q.is_anonymous then 'Anonymous user' else p.display_name end as author_display,
  case when q.is_anonymous then null else p.avatar_url end as author_avatar,
  q.upvote_count, q.answer_count,
  case when q.is_anonymous then null else p.username end as author_username
from public.questions q
join public.profiles p on p.id = q.author_id
where q.status in ('published', 'answered');

grant select on public.questions_public to anon, authenticated;

-- A minimal public profile view — non-sensitive fields only (no email, no
-- onboarded flag). Anyone can already learn a user's username/display_name/
-- avatar the moment they ask a non-anonymous question or post any answer
-- (questions_public / answers_public), so this just makes that same public
-- identity reachable at a stable URL instead of scattered across Q&A pages.
create or replace view public.profiles_public
with (security_invoker = off) as
select id, username, display_name, avatar_url, social_links, role, created_at
from public.profiles;

grant select on public.profiles_public to anon, authenticated;
