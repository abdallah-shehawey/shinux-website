-- ==============================================================================
-- Rebrand the notification emails: shehaweyblog -> shinux.
--
-- The site name, its domain and its whole visual identity changed. The emails
-- are generated inside Postgres, so none of that reached them: they still said
-- "shehaweyblog", linked to shehaweyblog.vercel.app, and wore an "SB" monogram
-- on a purple/blue Catppuccin gradient that never matched the site's green
-- terminal palette in the first place.
--
-- Postgres has no way to patch one line of a function body, so both functions
-- are re-published in full. What actually changed:
--
--   handle_notification_email  (last published in 0021)
--     • site_url  -> https://shinux.vercel.app
--     • every "shehaweyblog" in a subject line or in the body -> "shinux"
--     • the "SB" monogram -> the "sh_" wordmark, on the site's green
--     • the purple/blue CTA gradient -> the site's green, with dark text
--   send_notification_email    (last published in 0018)
--     • the fallback sender name -> "shinux <onboarding@resend.dev>"
--
-- The logic — which notification links where, who gets an actor line, when the
-- rejection reason is shown — is untouched.
--
-- Run this once via the Supabase SQL Editor, same as the earlier migrations.
-- ==============================================================================

create or replace function public.handle_notification_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
  subject text;
  site_url text := 'https://shinux.vercel.app';
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
    when 'new_question_published' then 'A new question was published on shinux'
    when 'mention'                then 'You were mentioned on shinux'
    when 'thread_answer'          then 'New answer on a question you answered'
    when 'thread_reply'           then 'New reply in a discussion you joined'
    else                               'New notification on shinux'
  end;

  -- ── link path ─────────────────────────────────────────────────────────────
  link_path := case
    when new.type = 'question_submitted' then '/admin/questions'
    -- A rejected question never gets a slug, so this is the branch it lands in.
    -- Anchor it at the question list, where /me now prints the feedback.
    when new.type = 'question_rejected' then '/me#questions'
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
      || '<span style="font-size:14px;color:#3fb950;font-weight:600">'
      || public.html_escape(actor)
      || '</span>'
      || '<span style="font-size:14px;color:#6e7681"> '
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
      || '<div style="background:#0d1117;border-radius:10px;padding:16px 20px;border-left:3px solid #f85149;color:#c9d1d9;font-size:14px;line-height:1.6">'
      || '<span style="display:block;font-weight:600;color:#f85149;margin-bottom:6px">Feedback from the reviewer</span>'
      || public.html_escape(new.payload->>'rejection_reason')
      || '</div></td></tr>';
  end if;

  -- ── full HTML body ────────────────────────────────────────────────────────
  body :=
  '<!DOCTYPE html>'
  || '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
  || '<title>' || public.html_escape(subject) || '</title>'
  || '</head>'
  || '<body style="margin:0;padding:0;background-color:#010409;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif">'
  || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#010409;padding:40px 16px">'
  || '<tr><td align="center">'

  -- ┌─ card ──────────────────────────────────────────────────────────────────
  || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#0d1117;border:1px solid #21262d;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.45)">'

  -- logo / brand bar — the "sh_" wordmark, same lockup as the site favicon.
  -- Mail clients strip <svg>, so it is set in a monospace stack instead: the
  -- underscore is a real character, which every client can render.
  || '<tr><td style="padding:32px 32px 0 32px;text-align:center">'
  || '<div style="display:inline-block;background:linear-gradient(180deg,#161b22,#0d1117);border:1px solid #30363d;border-radius:12px;padding:8px 16px;margin-bottom:16px">'
  || '<span style="font-family:''JetBrains Mono'',''SFMono-Regular'',Consolas,''Liberation Mono'',Menlo,monospace;'
  || 'font-size:24px;font-weight:800;color:#3fb950;letter-spacing:-.5px">sh_</span>'
  || '</div>'
  || '<div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#6e7681;margin-bottom:8px">shinux</div>'
  || '</td></tr>'

  -- divider
  || '<tr><td style="padding:0 32px"><div style="height:1px;background:linear-gradient(90deg,transparent,#21262d,transparent)"></div></td></tr>'

  -- heading
  || '<tr><td style="padding:28px 32px 8px 32px;text-align:center">'
  || '<h1 style="margin:0;font-size:20px;font-weight:700;color:#f0f6fc;line-height:1.4">' || public.html_escape(heading) || '</h1>'
  || '</td></tr>'

  -- who did it
  || actor_block

  -- detail (question title)
  || case when detail <> '' then
       '<tr><td style="padding:0 32px 24px 32px;text-align:center">'
       || '<p style="margin:0;font-size:15px;color:#8b949e;line-height:1.5">' || detail || '</p>'
       || '</td></tr>'
     else ''
     end

  -- rejection reason (if any)
  || reason_block

  -- CTA button
  || '<tr><td style="padding:8px 32px 32px 32px;text-align:center">'
  || '<a href="' || full_link || '" target="_blank" '
  || 'style="display:inline-block;padding:13px 36px;background:#3fb950;'
  || 'color:#010409;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;'
  || 'letter-spacing:.3px;box-shadow:0 4px 14px rgba(63,185,80,.30)">'
  || 'View on shinux &rarr;'
  || '</a>'
  || '</td></tr>'

  -- └─ card ──────────────────────────────────────────────────────────────────
  || '</table>'

  -- footer
  || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin-top:24px">'
  || '<tr><td style="text-align:center;padding:0 16px">'
  || '<p style="margin:0;font-size:12px;color:#6e7681;line-height:1.6">'
  || 'You received this because you have an account on '
  || '<a href="' || site_url || '" style="color:#3fb950;text-decoration:none">shinux</a>.'
  || '</p>'
  || '</td></tr></table>'

  || '</td></tr></table>'
  || '</body></html>';

  perform public.send_notification_email(target_email, subject, body);
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- The sender name the recipient sees. `onboarding@resend.dev` is still Resend's
-- shared test sender — it only delivers to the address the Resend account was
-- opened with. To reach anyone else, verify a domain in Resend and store the
-- sender once, from the SQL Editor:
--
--   select vault.create_secret('shinux <hello@yourdomain.com>', 'resend_from');
--
-- If that secret already exists it wins, and this migration does not touch it.
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
      'from', coalesce(nullif(btrim(from_address), ''), 'shinux <onboarding@resend.dev>'),
      'to', to_email,
      'subject', subject,
      'html', html_body
    )
  );
end;
$$;
