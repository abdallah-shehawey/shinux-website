-- ==============================================================================
-- Photos on a question.
--
-- Images are their own column rather than Markdown inside the body: the ask box
-- is a plain writing box now (no Markdown, no preview), so a photo must not
-- arrive as `![](url)` typed into it. Keeping them separate is also what lets
-- the question page lay them out as an attachment grid instead of dropping them
-- inline wherever the text happened to mention them.
--
-- Run this once via the Supabase SQL Editor, same as the earlier migrations.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1. The column. Empty array (not null) so every read can treat it as a list.
-- ---------------------------------------------------------------------------
alter table public.questions
  add column if not exists images text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- 2. Re-publish the public view with `images` appended.
--    Appending at the END is what keeps this a valid CREATE OR REPLACE: the
--    existing columns must stay in their current order with their current
--    types, and only new ones may follow.
-- ---------------------------------------------------------------------------
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
  coalesce(q.published_at, q.created_at) as sort_at,
  (q.status = 'answered') as is_answered,
  q.images
from public.questions q
join public.profiles p on p.id = q.author_id
where q.status in ('published', 'answered');

-- ---------------------------------------------------------------------------
-- 3. Storage: a public `question-images` bucket, one folder per user.
--    Same shape as `avatars` in 0002 — public read so the CDN URL can be
--    embedded directly, writes restricted to the uploader's own folder by the
--    folder-name convention.
--
--    Unlike an avatar, a question carries MANY images and they are never
--    overwritten, so each object gets its own generated name under the folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

drop policy if exists "question_images_select_public" on storage.objects;
create policy "question_images_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'question-images');

drop policy if exists "question_images_insert_own" on storage.objects;
create policy "question_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'question-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No update policy: an object here is written once and never replaced. Removing
-- a photo from a draft deletes the file outright.
drop policy if exists "question_images_delete_own" on storage.objects;
create policy "question_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'question-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
