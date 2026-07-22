-- ==============================================================================
-- linux-blog — optional admin feedback when a question is rejected.
-- ------------------------------------------------------------------------------
-- When the admin rejects a pending question they may (optionally) write a short
-- reason. That reason rides along into the existing 'question_rejected'
-- notification payload and the email body, so the asker learns WHY it was
-- rejected. Leaving the reason empty keeps the old behaviour (a plain
-- "not approved" notice) — with-feedback / without-feedback both supported.
--
-- Paste this into the Supabase SQL Editor (same as every other migration here —
-- no CLI in this environment). Safe to re-run (idempotent).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Store the admin's optional reason on the question row itself. The reject
--    action updates {status:'rejected', rejection_reason:'...'} in ONE update,
--    so the status-change trigger below sees it in `new`.
-- ------------------------------------------------------------------------------

alter table public.questions add column if not exists rejection_reason text;

-- ------------------------------------------------------------------------------
-- 2. Carry the reason into the 'question_rejected' notification payload.
--    Same function from 0005/0011, only the rejected branch changes — an empty
--    reason is normalised to NULL so downstream can cleanly tell "no feedback".
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
        jsonb_build_object(
          'question_id', new.id,
          'question_title', new.title,
          'rejection_reason', nullif(btrim(new.rejection_reason), '')
        )
      );
    end if;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. Include the reason in the rejection email body when present. Same central
--    email function from 0010/0011 — only the body build gains a reason block
--    for the 'question_rejected' type; every other type is byte-for-byte the
--    same output as before.
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

  body := '<p>' || coalesce(new.payload->>'question_title', subject) || '</p>';

  if new.type = 'question_rejected'
     and coalesce(new.payload->>'rejection_reason', '') <> '' then
    body := body ||
      '<p><strong>Feedback from the reviewer:</strong><br>' ||
      (new.payload->>'rejection_reason') || '</p>';
  end if;

  body := body ||
    '<p><a href="' || site_url || link_path || '">View on the site</a></p>';

  perform public.send_notification_email(target_email, subject, body);
  return new;
end;
$$;

-- Both triggers (questions_after_status_update from 0005,
-- notifications_after_insert_email from 0010) stay attached to these functions —
-- no need to recreate them.
