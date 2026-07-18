-- ==============================================================================
-- linux-blog — admin-controlled article display order
-- ------------------------------------------------------------------------------
-- Articles themselves stay file-based (content/articles/*.md) — this table
-- only stores an optional explicit position per slug, so the admin can pin
-- articles in whatever order they want instead of always strict date-desc.
-- Articles with no row here simply fall back to date order, appended after
-- every explicitly-ordered article (see src/lib/article-order.ts).
-- ==============================================================================

create table public.article_order (
  slug text primary key,
  position integer not null,
  updated_at timestamptz not null default now()
);

alter table public.article_order enable row level security;

create policy "article_order_select_public"
  on public.article_order for select
  to anon, authenticated
  using (true);

create policy "article_order_insert_admin_only"
  on public.article_order for insert
  to authenticated
  with check (public.is_admin());

create policy "article_order_update_admin_only"
  on public.article_order for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "article_order_delete_admin_only"
  on public.article_order for delete
  to authenticated
  using (public.is_admin());
