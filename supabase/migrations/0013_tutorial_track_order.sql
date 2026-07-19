-- ==============================================================================
-- linux-blog — admin-controlled tutorial track display order
-- ------------------------------------------------------------------------------
-- Same shape and reasoning as 0007_article_order.sql: tracks themselves stay
-- file-based (content/tutorials/<track>/_index.md), this table only stores an
-- optional explicit position per track slug so the admin can drag the track
-- cards on /tutorials into whatever order they want, instead of being stuck
-- with the `order` frontmatter that ships in the content files.
-- Tracks with no row here fall back to their frontmatter order, appended after
-- every explicitly-ordered track (see src/lib/tutorial-order.ts).
--
-- Note this orders TRACKS only. Lesson order inside a track stays in the lesson
-- frontmatter on purpose — it is a teaching sequence that prev/next navigation
-- walks, not a curation choice.
-- ==============================================================================

create table public.tutorial_track_order (
  slug text primary key,
  position integer not null,
  updated_at timestamptz not null default now()
);

alter table public.tutorial_track_order enable row level security;

create policy "tutorial_track_order_select_public"
  on public.tutorial_track_order for select
  to anon, authenticated
  using (true);

create policy "tutorial_track_order_insert_admin_only"
  on public.tutorial_track_order for insert
  to authenticated
  with check (public.is_admin());

create policy "tutorial_track_order_update_admin_only"
  on public.tutorial_track_order for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "tutorial_track_order_delete_admin_only"
  on public.tutorial_track_order for delete
  to authenticated
  using (public.is_admin());
