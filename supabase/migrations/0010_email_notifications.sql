-- ==============================================================================
-- linux-blog — email a copy of every notification (Resend), on top of the
-- existing in-app notifications.
-- ------------------------------------------------------------------------------
-- Uses pg_net (Supabase-provided) to call the Resend API directly from a
-- trigger — no Edge Function to deploy, which matters here since this
-- environment has no Supabase CLI access; everything is pasted into the SQL
-- Editor like every other migration in this project.
--
-- The Resend API key is NEVER put in this file (or anywhere in git) — it's
-- stored in Supabase Vault, which only the project owner can set, from the
-- SQL Editor, with their own real key:
--
--   select vault.create_secret('re_your_real_key_here', 'resend_api_key');
--
-- Until that's run, send_notification_email() silently no-ops (checked via
-- the `if api_key is null` guard below) — in-app notifications keep working
-- regardless of whether email is configured.
-- ==============================================================================

create extension if not exists pg_net;

create or replace function public.send_notification_email(
  to_email text,
  subject text,
  html_body text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  api_key text;
begin
  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;

  if api_key is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'linux-blog <onboarding@resend.dev>',
      'to', to_email,
      'subject', subject,
      'html', html_body
    )
  );
end;
$$;

-- One central trigger on notifications itself — fires for every type
-- (question_published/answered/rejected/submitted, answer_reply) regardless
-- of which other trigger created the row, so email dispatch doesn't need to
-- be duplicated into handle_answer_change / handle_question_status_change /
-- handle_reply_insert / handle_question_insert individually.
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

drop trigger if exists notifications_after_insert_email on public.notifications;
create trigger notifications_after_insert_email
  after insert on public.notifications
  for each row execute function public.handle_notification_email();
