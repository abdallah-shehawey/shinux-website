-- ==============================================================================
-- linux-blog — initial schema (Phase 3)
-- Implements Linux-site-spec.md §3 in full: tables, the questions_public view
-- (the anonymous-question logic), RLS policies, and the new-user trigger.
-- Run this once via the Supabase SQL Editor (or `supabase db push`).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  title text not null,
  body text not null,
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  is_anonymous boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'published', 'answered', 'rejected')),
  slug text unique,           -- generated on publish
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references public.profiles(id), -- the admin
  body text not null,
  is_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,          -- 'question_answered', 'question_published', ...
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- "Same question here" button
create table public.question_upvotes (
  question_id uuid references public.questions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (question_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 2. Public view (the core of the anonymous-question logic)
--
-- Golden rule: the public never receives `author_id` at all when a question is
-- anonymous. The hiding happens in the database, not in the UI.
-- ------------------------------------------------------------------------------

create view public.questions_public
with (security_invoker = off) as
select
  q.id, q.title, q.body, q.locale, q.status, q.slug, q.tags, q.created_at,
  q.is_anonymous,
  case when q.is_anonymous then null else q.author_id end as author_id,
  case when q.is_anonymous then 'Anonymous user' else p.display_name end as author_display,
  case when q.is_anonymous then null else p.avatar_url end as author_avatar
from public.questions q
join public.profiles p on p.id = q.author_id
where q.status in ('published', 'answered');

grant select on public.questions_public to anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. Helper: is the current user an admin?
--
-- SECURITY DEFINER + a fixed search_path so this is safe to call from inside
-- other tables' RLS policies without recursion or search_path hijacking.
-- ------------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ------------------------------------------------------------------------------
-- 4. Row Level Security
-- ------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.notifications enable row level security;
alter table public.question_upvotes enable row level security;

-- profiles: everyone can read their own profile (admins can read all, for the
-- future admin dashboard); only the new-user trigger inserts rows; `role` is
-- protected separately by a trigger below, not by RLS (RLS is per-row, not
-- per-column).
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- questions: admin sees everything; a user sees only their own questions
-- (any status); the public never queries this table directly — only through
-- questions_public above.
create policy "questions_select_own_or_admin"
  on public.questions for select
  to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy "questions_insert_own"
  on public.questions for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "questions_update_admin_only"
  on public.questions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A user may remove their own question while it's still pending review.
-- Note: §9.5 asks that REJECTED questions be soft-deleted (status change),
-- never hard-deleted — this delete policy exists for the "pending" case only.
create policy "questions_delete_own_pending_or_admin"
  on public.questions for delete
  to authenticated
  using (public.is_admin() or (author_id = auth.uid() and status = 'pending'));

-- answers: public read for published/answered questions; admin writes only.
create policy "answers_select_public"
  on public.answers for select
  to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.questions q
      where q.id = answers.question_id
        and q.status in ('published', 'answered')
    )
  );

create policy "answers_insert_admin_only"
  on public.answers for insert
  to authenticated
  with check (public.is_admin() and author_id = auth.uid());

create policy "answers_update_admin_only"
  on public.answers for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "answers_delete_admin_only"
  on public.answers for delete
  to authenticated
  using (public.is_admin());

-- notifications: each user reads and updates (marks read) only their own.
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- question_upvotes: a user manages only their own upvote row.
create policy "question_upvotes_select_own"
  on public.question_upvotes for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "question_upvotes_insert_own"
  on public.question_upvotes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "question_upvotes_delete_own"
  on public.question_upvotes for delete
  to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 5. Protect the `role` column (profiles.role must only change manually,
--    e.g. via the Supabase SQL Editor using the service_role, never via the app)
-- ------------------------------------------------------------------------------

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'profiles.role can only be changed by an administrator';
  end if;
  return new;
end;
$$;

create trigger profiles_role_immutable
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ------------------------------------------------------------------------------
-- 6. Auto-create a profile on first sign-in
-- ------------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data->>'user_name',        -- GitHub OAuth
    new.raw_user_meta_data->>'preferred_username', -- Google OAuth (rare)
    split_part(new.email, '@', 1),
    'user'
  );
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]+', '-', 'g');
  if base_username = '' or base_username is null then
    base_username := 'user';
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || '-' || suffix;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      base_username
    ),
    new.raw_user_meta_data->>'avatar_url'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
