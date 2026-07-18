-- ==============================================================================
-- linux-blog — owner delete on questions (any status), publish-time ordering,
-- and a broadcast notification/email to every user when a question is
-- published.
-- ------------------------------------------------------------------------------
-- Per the owner's explicit direction this deviates from 0001_init.sql's
-- design (§9.5: rejected questions soft-deleted only, owner-delete restricted
-- to 'pending') — owners may now hard-delete their own question in ANY
-- status. answers/answer_replies already allow owner-or-admin delete
-- unconditionally (0005, 0009) and admin already has unconditional delete on
-- all three via is_admin() — those needed no DB change, only UI (see the app
-- code in this commit).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. questions: owner may delete their own question regardless of status.
-- ------------------------------------------------------------------------------

drop policy if exists "questions_delete_own_pending_or_admin" on public.questions;
create policy "questions_delete_own_or_admin"
  on public.questions for delete
  to authenticated
  using (public.is_admin() or author_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 2. published_at: when a question was actually approved, distinct from
--    created_at (when it was originally submitted). Newly-approved questions
--    should jump to the top of the public listing, not stay buried at their
--    original submission time.
-- ------------------------------------------------------------------------------

alter table public.questions add column if not exists published_at timestamptz;

-- Backfill existing published/answered rows so they don't reshuffle relative
-- to each other — they keep their current relative order (by created_at).
update public.questions
  set published_at = created_at
  where status in ('published', 'answered') and published_at is null;

-- Rebuild questions_public (append-only rule: `create or replace view` cannot
-- reorder or rename existing columns, only append new ones at the very end —
-- the full existing column list, in order, is: id, title, body, locale,
-- status, slug, tags, created_at, is_anonymous, author_id, author_display,
-- author_avatar, upvote_count, answer_count, author_username (0001 + 0005's
-- counters + 0008's author_username). published_at/sort_at go after all of it.
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
  coalesce(q.published_at, q.created_at) as sort_at
from public.questions q
join public.profiles p on p.id = q.author_id
where q.status in ('published', 'answered');

grant select on public.questions_public to anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. Broadcast: notify every OTHER user (not the question's own author, who
--    already gets 'question_published'; not the acting admin themselves)
--    when a question is published, on top of the existing per-author
--    notification. Same function/trigger from 0005, extended.
-- ------------------------------------------------------------------------------

create or replace function public.handle_question_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and old.status = 'pending' then
    if new.status = 'published' then
      insert into public.notifications (user_id, type, payload)
      values (
        new.author_id,
        'question_published',
        jsonb_build_object('question_id', new.id, 'question_slug', new.slug, 'question_title', new.title)
      );

      insert into public.notifications (user_id, type, payload)
      select p.id, 'new_question_published',
        jsonb_build_object('question_id', new.id, 'question_slug', new.slug, 'question_title', new.title)
      from public.profiles p
      where p.id <> new.author_id and p.id is distinct from auth.uid();
    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, type, payload)
      values (
        new.author_id,
        'question_rejected',
        jsonb_build_object('question_id', new.id, 'question_title', new.title)
      );
    end if;
  end if;
  return new;
end;
$$;

-- Trigger already exists (questions_after_status_update, 0005) and stays
-- attached to this function — no need to recreate it.

-- ------------------------------------------------------------------------------
-- 4. Email subject for the new broadcast type. Same central trigger/function
--    from 0010 — its link_path CASE already falls through to
--    /questions/{slug} whenever payload->>'question_slug' is present, so only
--    the subject needs a new case.
-- ------------------------------------------------------------------------------

create or replace function public.handle_notification_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
  subject text;
  site_url text := 'https://shehaweyblog.vercel.app';
  link_path text;
  body text;
begin
  select email into target_email from auth.users where id = new.user_id;
  if target_email is null then
    return new;
  end if;

  subject := case new.type
    when 'question_published' then 'Your question was published'
    when 'question_answered' then 'Your question got a new answer'
    when 'question_rejected' then 'Your question was not approved'
    when 'question_submitted' then 'A new question needs review'
    when 'answer_reply' then 'Someone replied to your answer'
    when 'new_question_published' then 'A new question was published on linux-blog'
    else 'New notification on linux-blog'
  end;

  link_path := case
    when new.type = 'question_submitted' then '/admin/questions'
    when new.payload ? 'question_slug' and new.payload->>'question_slug' is not null
      then '/questions/' || (new.payload->>'question_slug')
    else '/me'
  end;

  body := '<p>' || coalesce(new.payload->>'question_title', subject) || '</p>' ||
          '<p><a href="' || site_url || link_path || '">View on the site</a></p>';

  perform public.send_notification_email(target_email, subject, body);
  return new;
end;
$$;

-- Trigger already exists (notifications_after_insert_email, 0010) and stays
-- attached to this function — no need to recreate it.
