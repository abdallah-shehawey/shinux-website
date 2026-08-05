-- ==============================================================================
-- shehaweyblog — @mentions and "someone else joined the discussion" notices.
-- ------------------------------------------------------------------------------
-- Three new notification types, each with an in-app entry AND an email (both
-- come free: handle_notification_email fires on every notifications row):
--
--   mention        someone wrote @you in a question, an answer or a reply
--   thread_answer  a question you answered got another answer
--   thread_reply   a discussion you replied in got another reply
--
-- The last two are the comment-thread behaviour: everybody already in a
-- conversation hears about the next message in it, not just its author.
--
-- ONE notification per person per event, by priority:
--   mention  >  direct (question_answered / answer_reply)  >  thread_*
-- Each step passes the ids it already notified to the next, so being named in a
-- reply to your own answer pings you once (as a mention), not three times.
--
-- Also fixes an HTML-injection hole in the email template that predates this
-- change: question titles and rejection reasons were concatenated raw into the
-- message body, so a title containing markup rendered as markup in the admin's
-- inbox. Everything user-controlled now goes through html_escape().
--
-- Paste into the Supabase SQL Editor (no CLI in this environment, same as every
-- other migration here). Safe to re-run.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Parsing @handles.
--
-- The Postgres half of src/lib/mentions.ts — MENTION_PATTERN there and this
-- regex are the same rule written twice and MUST be edited together, or a
-- mention renders as a link with nobody notified (or the reverse).
--
-- The leading alternation is what a lookbehind would do in JS: an @ preceded by
-- a letter/digit/_/-/@ or a slash is an email address, a doubled @@, or a URL
-- path — not a mention.
-- ------------------------------------------------------------------------------

create or replace function public.extract_mentions(body text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(distinct lower(m.groups[2])), '{}'::text[])
  from regexp_matches(
    coalesce(body, ''),
    '(^|[^A-Za-z0-9_@/-])@([A-Za-z0-9_-]{3,30})',
    'g'
  ) as m(groups);
$$;

-- ------------------------------------------------------------------------------
-- 2. Notify everyone named in a body, minus the author and anyone who is
--    already getting a more specific notification for the same event.
--
--    Returns the ids it notified so the caller can keep excluding them — that
--    chain is the whole de-duplication scheme.
-- ------------------------------------------------------------------------------

create or replace function public.notify_mentions(
  in_body text,
  in_actor uuid,
  in_payload jsonb,
  in_skip uuid[]
) returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  targets uuid[];
begin
  select coalesce(array_agg(p.id), '{}'::uuid[])
    into targets
  from public.profiles p
  where p.username = any (public.extract_mentions(in_body))
    and p.id is distinct from in_actor
    and not (p.id = any (coalesce(in_skip, '{}'::uuid[])));

  if coalesce(array_length(targets, 1), 0) = 0 then
    return '{}'::uuid[];
  end if;

  insert into public.notifications (user_id, type, payload)
  select t.id, 'mention', in_payload from unnest(targets) as t(id);

  return targets;
end;
$$;

-- Handles that were ALREADY mentioned in an older revision of a body. Passed as
-- the skip list when a body is edited, so a re-save only pings the people the
-- edit newly named.
create or replace function public.already_mentioned_ids(body text)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(p.id), '{}'::uuid[])
  from public.profiles p
  where p.username = any (public.extract_mentions(body));
$$;

-- ------------------------------------------------------------------------------
-- 3. A new answer: the asker, then anyone named in it, then everyone else who
--    had already answered this question.
--    Extends handle_answer_change from 0005 — the counter and the
--    published -> answered flip are unchanged.
-- ------------------------------------------------------------------------------

create or replace function public.handle_answer_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.questions%rowtype;
  actor_name text;
  base_payload jsonb;
  notified uuid[] := '{}'::uuid[];
begin
  if tg_op = 'INSERT' then
    select * into q from public.questions where id = new.question_id;

    update public.questions
      set answer_count = answer_count + 1,
          status = case when status = 'published' then 'answered' else status end
      where id = new.question_id;

    select coalesce(nullif(btrim(p.display_name), ''), p.username)
      into actor_name
      from public.profiles p where p.id = new.author_id;

    base_payload := jsonb_build_object(
      'question_id', q.id,
      'question_slug', q.slug,
      'question_title', q.title,
      'answer_id', new.id,
      'actor_name', actor_name
    );

    -- (a) the person who asked
    if q.author_id is not null and q.author_id <> new.author_id then
      insert into public.notifications (user_id, type, payload)
      values (q.author_id, 'question_answered', base_payload);
      notified := notified || q.author_id;
    end if;

    -- (b) anyone named in the answer
    notified := notified || public.notify_mentions(new.body, new.author_id, base_payload, notified);

    -- (c) everyone else already answering this question
    insert into public.notifications (user_id, type, payload)
    select distinct a.author_id, 'thread_answer', base_payload
    from public.answers a
    where a.question_id = new.question_id
      and a.id <> new.id
      and a.author_id <> new.author_id
      and not (a.author_id = any (notified));

    return new;

  elsif tg_op = 'DELETE' then
    update public.questions
      set answer_count = greatest(answer_count - 1, 0),
          status = case
            when status = 'answered' and answer_count <= 1 then 'published'
            else status
          end
      where id = old.question_id;

    return old;
  end if;

  return null;
end;
$$;

-- Trigger answers_after_change (0005) stays attached to this function.

-- ------------------------------------------------------------------------------
-- 4. An edited answer: only handles the edit ADDED get a mention. Someone
--    already named in the previous revision is not pinged again for a typo fix.
-- ------------------------------------------------------------------------------

create or replace function public.handle_answer_update_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.questions%rowtype;
  actor_name text;
begin
  if new.body is not distinct from old.body then
    return new;
  end if;

  select * into q from public.questions where id = new.question_id;
  select coalesce(nullif(btrim(p.display_name), ''), p.username)
    into actor_name
    from public.profiles p where p.id = new.author_id;

  perform public.notify_mentions(
    new.body,
    coalesce(auth.uid(), new.author_id),
    jsonb_build_object(
      'question_id', q.id,
      'question_slug', q.slug,
      'question_title', q.title,
      'answer_id', new.id,
      'actor_name', actor_name
    ),
    public.already_mentioned_ids(old.body)
  );

  return new;
end;
$$;

drop trigger if exists answers_after_update_mentions on public.answers;
create trigger answers_after_update_mentions
  after update on public.answers
  for each row execute function public.handle_answer_update_mentions();

-- ------------------------------------------------------------------------------
-- 5. A new reply: the answer's author, then anyone named in it, then everyone
--    else who had already replied under that same answer.
--    Extends handle_reply_insert from 0009.
-- ------------------------------------------------------------------------------

create or replace function public.handle_reply_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ans public.answers%rowtype;
  q public.questions%rowtype;
  actor_name text;
  base_payload jsonb;
  notified uuid[] := '{}'::uuid[];
begin
  select * into ans from public.answers where id = new.answer_id;
  select * into q from public.questions where id = ans.question_id;

  select coalesce(nullif(btrim(p.display_name), ''), p.username)
    into actor_name
    from public.profiles p where p.id = new.author_id;

  base_payload := jsonb_build_object(
    'question_id', q.id,
    'question_slug', q.slug,
    'question_title', q.title,
    'answer_id', ans.id,
    'reply_id', new.id,
    'actor_name', actor_name
  );

  -- (a) whoever wrote the answer being replied to
  if ans.author_id is not null and ans.author_id <> new.author_id then
    insert into public.notifications (user_id, type, payload)
    values (ans.author_id, 'answer_reply', base_payload);
    notified := notified || ans.author_id;
  end if;

  -- (b) anyone named in the reply
  notified := notified || public.notify_mentions(new.body, new.author_id, base_payload, notified);

  -- (c) everyone else already in this reply thread
  insert into public.notifications (user_id, type, payload)
  select distinct r.author_id, 'thread_reply', base_payload
  from public.answer_replies r
  where r.answer_id = new.answer_id
    and r.id <> new.id
    and r.author_id <> new.author_id
    and not (r.author_id = any (notified));

  return new;
end;
$$;

-- Trigger answer_replies_after_insert (0009) stays attached to this function.

-- ------------------------------------------------------------------------------
-- 6. Publishing a question: the asker, then anyone named in the body, then the
--    broadcast to everybody else.
--
--    Mentioned people are cut OUT of the broadcast on purpose — "you were
--    mentioned" is the better version of "a question was published", and
--    sending both would mean two emails for one event.
--
--    An ANONYMOUS question must not leak its asker, so the mention notification
--    it produces is attributed to "Anonymous user" exactly like questions_public
--    does. Extends handle_question_status_change from 0005/0011/0014.
-- ------------------------------------------------------------------------------

create or replace function public.handle_question_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  base_payload jsonb;
  notified uuid[] := '{}'::uuid[];
begin
  if new.status is distinct from old.status and old.status = 'pending' then
    if new.status = 'published' then
      if new.is_anonymous then
        actor_name := 'Anonymous user';
      else
        select coalesce(nullif(btrim(p.display_name), ''), p.username)
          into actor_name
          from public.profiles p where p.id = new.author_id;
      end if;

      base_payload := jsonb_build_object(
        'question_id', new.id,
        'question_slug', new.slug,
        'question_title', new.title,
        'actor_name', actor_name
      );

      insert into public.notifications (user_id, type, payload)
      values (new.author_id, 'question_published', base_payload);
      notified := notified || new.author_id;

      notified := notified
        || public.notify_mentions(new.body, new.author_id, base_payload, notified);

      insert into public.notifications (user_id, type, payload)
      select p.id, 'new_question_published', base_payload
      from public.profiles p
      where not (p.id = any (notified))
        and p.id is distinct from auth.uid();

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

  -- An already-public question whose body was edited (admin-only in the UI):
  -- ping only the handles the edit added.
  elsif new.status in ('published', 'answered')
        and new.body is distinct from old.body then

    if new.is_anonymous then
      actor_name := 'Anonymous user';
    else
      select coalesce(nullif(btrim(p.display_name), ''), p.username)
        into actor_name
        from public.profiles p where p.id = new.author_id;
    end if;

    perform public.notify_mentions(
      new.body,
      coalesce(auth.uid(), new.author_id),
      jsonb_build_object(
        'question_id', new.id,
        'question_slug', new.slug,
        'question_title', new.title,
        'actor_name', actor_name
      ),
      public.already_mentioned_ids(old.body)
    );
  end if;

  return new;
end;
$$;

-- Trigger questions_after_status_update (0005) stays attached to this function.

-- ------------------------------------------------------------------------------
-- 7. Email: subjects for the three new types, an "X mentioned you" line, and
--    HTML escaping for everything the sender controls.
--    Same template as 0015, same central trigger from 0010.
-- ------------------------------------------------------------------------------

create or replace function public.html_escape(t text)
returns text
language sql
immutable
set search_path = public
as $$
  select replace(replace(replace(replace(replace(
    coalesce(t, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

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
  heading text;
  detail text;
  actor text;
  actor_block text;
  reason_block text;
  full_link text;
  body text;
begin
  select email into target_email from auth.users where id = new.user_id;
  if target_email is null then
    return new;
  end if;

  -- ── subject line ──────────────────────────────────────────────────────────
  subject := case new.type
    when 'question_published'     then 'Your question was published'
    when 'question_answered'      then 'Your question got a new answer'
    when 'question_rejected'      then 'Your question was not approved'
    when 'question_submitted'     then 'A new question needs review'
    when 'answer_reply'           then 'Someone replied to your answer'
    when 'new_question_published' then 'A new question was published on shehaweyblog'
    when 'mention'                then 'You were mentioned on shehaweyblog'
    when 'thread_answer'          then 'New answer on a question you answered'
    when 'thread_reply'           then 'New reply in a discussion you joined'
    else                               'New notification on shehaweyblog'
  end;

  -- ── link path ─────────────────────────────────────────────────────────────
  link_path := case
    when new.type = 'question_submitted' then '/admin/questions'
    when new.payload ? 'question_slug' and new.payload->>'question_slug' is not null
      then '/questions/' || (new.payload->>'question_slug')
    else '/me'
  end;
  full_link := site_url || link_path;

  -- ── heading & detail ──────────────────────────────────────────────────────
  heading := subject;
  detail  := public.html_escape(new.payload->>'question_title');

  -- ── who did it (mentions and thread activity only) ────────────────────────
  actor := nullif(btrim(coalesce(new.payload->>'actor_name', '')), '');
  actor_block := '';
  if actor is not null and new.type in ('mention', 'thread_answer', 'thread_reply') then
    actor_block :=
      '<tr><td style="padding:0 32px 20px 32px;text-align:center">'
      || '<span style="font-size:14px;color:#89b4fa;font-weight:600">'
      || public.html_escape(actor)
      || '</span>'
      || '<span style="font-size:14px;color:#6c7086"> '
      || case new.type
           when 'mention' then 'mentioned you'
           else 'joined the discussion'
         end
      || '</span></td></tr>';
  end if;

  -- ── optional rejection reason ─────────────────────────────────────────────
  reason_block := '';
  if new.type = 'question_rejected'
     and coalesce(new.payload->>'rejection_reason', '') <> '' then
    reason_block :=
      '<tr><td style="padding:0 32px 24px 32px">'
      || '<div style="background:#1e1e2e;border-radius:10px;padding:16px 20px;border-left:3px solid #f38ba8;color:#cdd6f4;font-size:14px;line-height:1.6">'
      || '<span style="display:block;font-weight:600;color:#f38ba8;margin-bottom:6px">Feedback from the reviewer</span>'
      || public.html_escape(new.payload->>'rejection_reason')
      || '</div></td></tr>';
  end if;

  -- ── full HTML body ────────────────────────────────────────────────────────
  body :=
  '<!DOCTYPE html>'
  || '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
  || '<title>' || public.html_escape(subject) || '</title>'
  || '</head>'
  || '<body style="margin:0;padding:0;background-color:#11111b;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif">'
  || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#11111b;padding:40px 16px">'
  || '<tr><td align="center">'

  -- ┌─ card ──────────────────────────────────────────────────────────────────
  || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#181825;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.45)">'

  -- logo / brand bar
  || '<tr><td style="padding:32px 32px 0 32px;text-align:center">'
  || '<div style="display:inline-block;background:linear-gradient(135deg,#cba6f7,#89b4fa);border-radius:12px;padding:10px 14px;margin-bottom:16px">'
  || '<span style="font-size:22px;font-weight:800;color:#11111b;letter-spacing:-.3px">SB</span>'
  || '</div>'
  || '<div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#6c7086;margin-bottom:8px">shehaweyblog</div>'
  || '</td></tr>'

  -- divider
  || '<tr><td style="padding:0 32px"><div style="height:1px;background:linear-gradient(90deg,transparent,#313244,transparent)"></div></td></tr>'

  -- heading
  || '<tr><td style="padding:28px 32px 8px 32px;text-align:center">'
  || '<h1 style="margin:0;font-size:20px;font-weight:700;color:#cdd6f4;line-height:1.4">' || public.html_escape(heading) || '</h1>'
  || '</td></tr>'

  -- who did it
  || actor_block

  -- detail (question title)
  || case when detail <> '' then
       '<tr><td style="padding:0 32px 24px 32px;text-align:center">'
       || '<p style="margin:0;font-size:15px;color:#a6adc8;line-height:1.5">' || detail || '</p>'
       || '</td></tr>'
     else ''
     end

  -- rejection reason (if any)
  || reason_block

  -- CTA button
  || '<tr><td style="padding:8px 32px 32px 32px;text-align:center">'
  || '<a href="' || full_link || '" target="_blank" '
  || 'style="display:inline-block;padding:13px 36px;background:linear-gradient(135deg,#cba6f7,#89b4fa);'
  || 'color:#11111b;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;'
  || 'letter-spacing:.3px;box-shadow:0 4px 14px rgba(137,180,250,.35);transition:transform .15s">'
  || 'View on shehaweyblog &rarr;'
  || '</a>'
  || '</td></tr>'

  -- └─ card ──────────────────────────────────────────────────────────────────
  || '</table>'

  -- footer
  || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin-top:24px">'
  || '<tr><td style="text-align:center;padding:0 16px">'
  || '<p style="margin:0;font-size:12px;color:#585b70;line-height:1.6">'
  || 'You received this because you have an account on '
  || '<a href="' || site_url || '" style="color:#89b4fa;text-decoration:none">shehaweyblog</a>.'
  || '</p>'
  || '</td></tr></table>'

  || '</td></tr></table>'
  || '</body></html>';

  perform public.send_notification_email(target_email, subject, body);
  return new;
end;
$$;

-- Trigger notifications_after_insert_email (0010) stays attached to this
-- function.

-- ------------------------------------------------------------------------------
-- 8. Make the sender address configurable.
--
-- `onboarding@resend.dev` is Resend's shared test sender: it will only deliver
-- to the address the Resend account was opened with. Every notification to
-- anyone ELSE — the whole "a new question was published" broadcast, every
-- mention of another member — is accepted by the API and then dropped.
--
-- To actually reach other people: verify a domain in Resend, then store the
-- sender once, from the SQL Editor:
--
--   select vault.create_secret('shehaweyblog <hello@yourdomain.com>', 'resend_from');
--
-- Until that secret exists nothing changes — it falls back to the test sender.
-- ------------------------------------------------------------------------------

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
  from_address text;
begin
  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;

  if api_key is null then
    return;
  end if;

  select decrypted_secret into from_address
  from vault.decrypted_secrets
  where name = 'resend_from'
  limit 1;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', coalesce(nullif(btrim(from_address), ''), 'shehaweyblog <onboarding@resend.dev>'),
      'to', to_email,
      'subject', subject,
      'html', html_body
    )
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 9. Index for the reply-thread and answer-thread participant lookups above.
-- ------------------------------------------------------------------------------

create index if not exists answer_replies_answer_id_idx
  on public.answer_replies (answer_id);

create index if not exists answers_question_id_idx
  on public.answers (question_id);
