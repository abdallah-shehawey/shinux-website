-- ==============================================================================
-- shehaweyblog — modern email template & rebrand from "linux-blog".
-- ------------------------------------------------------------------------------
-- Replaces both `send_notification_email` (sender name) and
-- `handle_notification_email` (subject lines, HTML body) with a polished,
-- dark-themed email template and a styled CTA button.
--
-- Changes:
--   • sender name:  'linux-blog'  →  'shehaweyblog'
--   • subject lines referencing "linux-blog"  →  "shehaweyblog"
--   • HTML body: plain <p>+<a> replaced with a modern responsive template
--     featuring a dark card, subtle branding, and a rounded gradient button.
--
-- Safe to re-run (idempotent — CREATE OR REPLACE).
-- ==============================================================================

-- 1. Update the sender name ---------------------------------------------------

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
      'from', 'shehaweyblog <onboarding@resend.dev>',
      'to', to_email,
      'subject', subject,
      'html', html_body
    )
  );
end;
$$;

-- 2. Modern email template + rebranded subjects ------------------------------

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
  detail  := coalesce(new.payload->>'question_title', '');

  -- ── optional rejection reason ─────────────────────────────────────────────
  reason_block := '';
  if new.type = 'question_rejected'
     and coalesce(new.payload->>'rejection_reason', '') <> '' then
    reason_block :=
      '<tr><td style="padding:0 32px 24px 32px">'
      || '<div style="background:#1e1e2e;border-radius:10px;padding:16px 20px;border-left:3px solid #f38ba8;color:#cdd6f4;font-size:14px;line-height:1.6">'
      || '<span style="display:block;font-weight:600;color:#f38ba8;margin-bottom:6px">Feedback from the reviewer</span>'
      || (new.payload->>'rejection_reason')
      || '</div></td></tr>';
  end if;

  -- ── full HTML body ────────────────────────────────────────────────────────
  body :=
  '<!DOCTYPE html>'
  || '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
  || '<title>' || subject || '</title>'
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
  || '<h1 style="margin:0;font-size:20px;font-weight:700;color:#cdd6f4;line-height:1.4">' || heading || '</h1>'
  || '</td></tr>'

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

-- Both triggers stay attached — no need to recreate them.
