-- ==============================================================================
-- Land the rejection email on the feedback, not just near it.
--
-- A rejected question has no slug (it was never published), so the link in its
-- email already fell through to '/me'. That page now shows the reviewer's
-- feedback under the question itself, so the link may as well arrive at it —
-- '/me#questions' scrolls straight to the list instead of dropping the reader
-- at the top of their account page to go looking.
--
-- Postgres has no way to patch one line of a function body, so this is
-- handle_notification_email from 0018 re-published verbatim with a single
-- changed branch in the `link_path` case. Nothing else in it differs.
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
