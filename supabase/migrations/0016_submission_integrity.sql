-- ============================================================================
-- 0016 — submission integrity
--
-- Closes two holes where a logged-in user could write privileged columns by
-- talking to the PostgREST API directly instead of going through the site.
--
-- Both tables' INSERT policies only ever constrained WHO the row belongs to:
--
--   questions_insert_own       with check (author_id = auth.uid())
--   answers_insert_authenticated
--                              with check (author_id = auth.uid()
--                                          and is_question_visible(question_id))
--
-- Nothing constrained WHAT the row said. An RLS `with check` cannot express
-- "this column must keep its default", so the guard has to be a BEFORE trigger
-- that normalises the row instead.
--
-- 1. questions.status — the moderation bypass.
--    `status` defaults to 'pending' and only admins may UPDATE it, but a user
--    could simply INSERT with status = 'published'. questions_public selects
--    `where status in ('published','answered')` with no slug requirement, so
--    the row went straight onto the public feed, unreviewed. It also dodged
--    the admin ping: questions_after_insert (0009) fires only
--    `when (new.status = 'pending')`, so nobody was even told. The same insert
--    could set `slug` (unique — also lets an attacker squat a slug),
--    `published_at`, and the denormalised `upvote_count` / `answer_count`
--    counters, which no trigger ever recomputes from scratch.
--
-- 2. answers.is_accepted — fake "accepted answer" badge.
--    Nothing in the app ever writes this column; it is read-only UI state that
--    sorts an answer to the top (questions.ts orders by is_accepted desc).
--    A user could set it at INSERT, and answers_update_own_or_admin let them
--    flip it on their own answer afterwards too.
--
-- Both triggers no-op for the real UI: AskForm sends only
-- author_id/title/body/locale/is_anonymous/tags, and AnswerForm only
-- question_id/author_id/body.
-- ============================================================================

-- Server-side scripts (scripts/seed-faq.mjs) legitimately insert already
-- published questions with the service-role key. service_role bypasses RLS but
-- NOT triggers, so it needs an explicit exemption or re-seeding would silently
-- reset every seeded question to 'pending'.
--
-- Reads the PostgREST JWT claim directly rather than via auth.role() so the
-- check does not depend on the auth schema's helper set.
create or replace function public.is_service_role()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  ) = 'service_role';
$$;

-- ---------------------------------------------------------------------------
-- questions: a non-admin submission always starts as an unreviewed draft.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_question_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_role() or public.is_admin() then
    return new;
  end if;

  new.status := 'pending';
  new.slug := null;
  new.published_at := null;
  new.rejection_reason := null;
  new.upvote_count := 0;
  new.answer_count := 0;
  return new;
end;
$$;

drop trigger if exists questions_before_insert_enforce on public.questions;
create trigger questions_before_insert_enforce
  before insert on public.questions
  for each row
  execute function public.enforce_question_submission();

-- ---------------------------------------------------------------------------
-- answers: only an admin may mark an answer accepted, and only they may
-- un-mark it. A normal author keeps full control of their own body text.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_answer_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_role() or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_accepted := false;
  else
    new.is_accepted := old.is_accepted;
  end if;
  return new;
end;
$$;

drop trigger if exists answers_before_write_enforce on public.answers;
create trigger answers_before_write_enforce
  before insert or update on public.answers
  for each row
  execute function public.enforce_answer_acceptance();

-- ---------------------------------------------------------------------------
-- Clean up anything that slipped through before the triggers existed.
-- A published question with no slug could only have come from a direct API
-- insert — the admin publish path always generates one.
-- ---------------------------------------------------------------------------
update public.questions
set status = 'pending', published_at = null
where status in ('published', 'answered')
  and slug is null;
