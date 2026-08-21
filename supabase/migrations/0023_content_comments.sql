-- ==============================================================================
-- shinux — comments on articles, tracks and lessons.
--
-- The Q&A pages have had a full discussion under them since 0009/0018:
-- answers, one level of replies, @mentions, and a notification for everybody
-- already in the conversation. Everything else on the site — every article,
-- every tutorial track and every lesson inside it — had no way to say anything
-- at all. This gives them the same discussion, with the same rules.
--
-- Why a separate table instead of reusing answers/answer_replies: those hang off
-- questions.id, and articles and lessons are not rows. They are Markdown files
-- under content/, addressed by slug (this is also how article_order and
-- tutorial_track_order already refer to them). So a comment points at a piece of
-- content by KIND + SLUG:
--
--   article   'shinux-package-repository'
--   tutorial  'scripts'                              (a track's own page)
--   lesson    'scripts/smart-file-renaming-and-padnum'
--
-- Nesting is one level deep, exactly like the Q&A replies and like Facebook:
-- replying to a reply attaches to the same root comment and @mentions the
-- person instead of indenting further. That is enforced here (normalise_
-- comment_parent) rather than trusted to the client, because the client is the
-- browser.
--
-- Three notification types, all of which come with an email for free — the
-- trigger from 0010 fires on every notifications row:
--
--   comment_reply    someone replied to your comment
--   thread_comment   a discussion you commented in got another comment
--   comment_posted   admin-only: something was commented on
--
-- ...plus `mention`, which is the same one the Q&A uses. The de-duplication is
-- the chain from 0018: mention > direct > thread > admin, each step passing the
-- ids it notified to the next, so one event is one notification per person.
--
-- Paste into the Supabase SQL Editor (no CLI in this environment, same as every
-- other migration here). Safe to re-run.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. The table.
-- ------------------------------------------------------------------------------

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('article', 'tutorial', 'lesson')),
  -- The content's own address: an article slug, a track slug, or 'track/lesson'.
  -- Constrained to the shape slugify() produces so a stray value cannot be used
  -- to smuggle markup into an email subject line.
  target_slug text not null check (target_slug ~ '^[a-z0-9][a-z0-9/_-]{0,119}$'),
  -- The human title of that page, so a notification can name what was commented
  -- on without this database having to know how to read content/.
  target_title text,
  -- null for a top-level comment; the ROOT comment for a reply — never a reply
  -- itself, see the trigger below.
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- The one query the page makes: every comment on this piece of content, oldest
-- first, the order a conversation is read in.
create index if not exists comments_target_idx
  on public.comments (target_kind, target_slug, created_at);

-- Both the reply-thread participant lookup and the cascade delete walk this.
create index if not exists comments_parent_idx
  on public.comments (parent_id);

alter table public.comments enable row level security;

-- Public content, public discussion: no visibility rule to apply, unlike
-- questions, which can still be pending review.
drop policy if exists "comments_select_public" on public.comments;
create policy "comments_select_public"
  on public.comments for select
  to anon, authenticated
  using (true);

drop policy if exists "comments_insert_authenticated" on public.comments;
create policy "comments_insert_authenticated"
  on public.comments for insert
  to authenticated
  with check (author_id = auth.uid());

-- Editing is deliberately absent, exactly as it is for answer_replies: a
-- comment is a remark in a conversation, and the way to correct one is to
-- delete it and say it again.
drop policy if exists "comments_delete_own_or_admin" on public.comments;
create policy "comments_delete_own_or_admin"
  on public.comments for delete
  to authenticated
  using (public.is_admin() or author_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 2. Public read view — the author join, same technique as answers_public.
--
-- security_invoker = off so an anonymous reader can see who wrote a comment
-- without profiles having to be readable row by row.
-- ------------------------------------------------------------------------------

create or replace view public.comments_public
with (security_invoker = off) as
select
  c.id,
  c.target_kind,
  c.target_slug,
  c.parent_id,
  c.body,
  c.created_at,
  c.author_id,
  p.display_name as author_display,
  p.avatar_url   as author_avatar,
  p.username     as author_username
from public.comments c
join public.profiles p on p.id = c.author_id;

grant select on public.comments_public to anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. One level of nesting, decided here.
--
-- A reply to a reply belongs to the root of that thread. Flattening it in the
-- database rather than in the composer means the shape holds no matter what
-- posted the row, and the reader still knows who was being answered: the client
-- puts an @mention in front of the text, which is what Facebook does and what
-- the Q&A replies already did.
--
-- The target is copied from the parent for the same reason — a reply cannot be
-- filed under a different article from the comment it answers.
-- ------------------------------------------------------------------------------

create or replace function public.normalise_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent public.comments%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into parent from public.comments where id = new.parent_id;
  if not found then
    raise exception 'parent comment % does not exist', new.parent_id;
  end if;

  new.parent_id := coalesce(parent.parent_id, parent.id);
  new.target_kind := parent.target_kind;
  new.target_slug := parent.target_slug;
  new.target_title := coalesce(new.target_title, parent.target_title);
  return new;
end;
$$;

drop trigger if exists comments_before_insert_normalise on public.comments;
create trigger comments_before_insert_normalise
  before insert on public.comments
  for each row execute function public.normalise_comment_parent();

-- ------------------------------------------------------------------------------
-- 4. Where a comment lives, as a path this site can open.
--
-- Used by the notification payload and, through it, by the email's button.
-- Lessons already carry 'track/lesson' in their slug, so tutorials and lessons
-- share a branch.
-- ------------------------------------------------------------------------------

create or replace function public.comment_target_path(kind text, slug text)
returns text
language sql
immutable
set search_path = public
as $$
  select case kind
    when 'article' then '/articles/' || slug
    else '/tutorials/' || slug
  end;
$$;

-- ------------------------------------------------------------------------------
-- 5. Who hears about a new comment.
--
--   (a) the author of the comment being replied to      comment_reply
--   (b) everyone named with an @handle                  mention
--   (c) everyone else already in the same conversation  thread_comment
--   (d) the admins, so nothing is said on the site unseen   comment_posted
--
-- (c) is scoped the way the Q&A scopes it: a reply reaches the people in ITS
-- thread, a new top-level comment reaches everyone who has commented on that
-- page at all.
-- ------------------------------------------------------------------------------

create or replace function public.handle_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent public.comments%rowtype;
  actor_name text;
  base_payload jsonb;
  notified uuid[] := '{}'::uuid[];
begin
  select coalesce(nullif(btrim(p.display_name), ''), p.username)
    into actor_name
    from public.profiles p where p.id = new.author_id;

  base_payload := jsonb_build_object(
    'comment_id', new.id,
    'target_kind', new.target_kind,
    'target_slug', new.target_slug,
    'target_title', new.target_title,
    'target_path', public.comment_target_path(new.target_kind, new.target_slug),
    'actor_name', actor_name
  );

  -- (a) whoever wrote the comment being replied to
  if new.parent_id is not null then
    select * into parent from public.comments where id = new.parent_id;
    if found and parent.author_id <> new.author_id then
      insert into public.notifications (user_id, type, payload)
      values (parent.author_id, 'comment_reply', base_payload);
      notified := notified || parent.author_id;
    end if;
  end if;

  -- (b) anyone named in the body
  notified := notified || public.notify_mentions(new.body, new.author_id, base_payload, notified);

  -- (c) everyone else already in this conversation.
  --
  -- RETURNING rather than re-running the same SELECT to extend `notified`: the
  -- chain only works if the skip list is exactly who was written to, and a
  -- second query would also sweep in people this branch decided NOT to notify —
  -- an admin who commented elsewhere on the page would then be cut out of (d)
  -- as well and hear nothing at all.
  with inserted as (
    insert into public.notifications (user_id, type, payload)
    select distinct c.author_id, 'thread_comment', base_payload
    from public.comments c
    where c.target_kind = new.target_kind
      and c.target_slug = new.target_slug
      and c.id <> new.id
      and c.author_id <> new.author_id
      and not (c.author_id = any (notified))
      -- A reply stays inside its own thread; a new top-level comment reaches
      -- the whole page.
      and (
        new.parent_id is null
        or c.id = new.parent_id
        or c.parent_id = new.parent_id
      )
    returning user_id
  )
  select notified || coalesce(array_agg(user_id), '{}'::uuid[])
    into notified
  from inserted;

  -- (d) the admins. Comments are the one thing on this site that appears in
  -- public without passing through the review queue, so the people who can
  -- delete them are told that there is something to look at.
  insert into public.notifications (user_id, type, payload)
  select p.id, 'comment_posted', base_payload
  from public.profiles p
  where p.role = 'admin'
    and p.id <> new.author_id
    and not (p.id = any (notified));

  return new;
end;
$$;

drop trigger if exists comments_after_insert on public.comments;
create trigger comments_after_insert
  after insert on public.comments
  for each row execute function public.handle_comment_insert();

-- ------------------------------------------------------------------------------
-- 6. Email.
--
-- Re-published in full because Postgres has no way to patch one line of a
-- function body. Against 0022, what changed is only:
--
--   • subjects for comment_reply / thread_comment / comment_posted
--   • link_path now understands payload.target_path, so a comment email opens
--     the article or lesson it was written on instead of falling through to /me
--   • the detail line falls back to target_title when there is no question
--   • the "X commented" actor line covers the new types
--
-- Everything else — the layout, the palette, the rejection block — is 0022's.
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
    when 'comment_reply'          then 'Someone replied to your comment'
    when 'thread_comment'         then 'New comment in a discussion you joined'
    when 'comment_posted'         then 'A new comment was posted on shinux'
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
    -- Comments: straight to the article, track or lesson, and to the comment
    -- itself once the page has loaded.
    when new.payload ? 'target_path' and new.payload->>'target_path' is not null
      then (new.payload->>'target_path')
        || case
             when new.payload ? 'comment_id'
               then '#comment-' || (new.payload->>'comment_id')
             else ''
           end
    else '/me'
  end;
  full_link := site_url || link_path;

  -- ── heading & detail ──────────────────────────────────────────────────────
  heading := subject;
  detail  := public.html_escape(
    coalesce(new.payload->>'question_title', new.payload->>'target_title')
  );

  -- ── who did it (mentions and thread activity only) ────────────────────────
  actor := nullif(btrim(coalesce(new.payload->>'actor_name', '')), '');
  actor_block := '';
  if actor is not null and new.type in (
    'mention', 'thread_answer', 'thread_reply',
    'comment_reply', 'thread_comment', 'comment_posted'
  ) then
    actor_block :=
      '<tr><td style="padding:0 32px 20px 32px;text-align:center">'
      || '<span style="font-size:14px;color:#3fb950;font-weight:600">'
      || public.html_escape(actor)
      || '</span>'
      || '<span style="font-size:14px;color:#6e7681"> '
      || case new.type
           when 'mention' then 'mentioned you'
           when 'comment_reply' then 'replied to your comment'
           when 'comment_posted' then 'left a comment'
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

  -- detail (what it was about)
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

-- Trigger notifications_after_insert_email (0010) stays attached to this
-- function.
