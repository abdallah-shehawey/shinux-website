-- ==============================================================================
-- linux-blog — content keeps its author across a username change
-- ------------------------------------------------------------------------------
-- Renaming an account RELEASES the old handle: profiles.username is one unique
-- column, so /u/<old> dies the instant the row is written and the next person
-- to type that handle gets it. That is deliberate — this migration does NOT
-- bring the old URL back.
--
-- What it fixes is attribution. Questions, answers and replies reference
-- profiles(id), so they follow their author through any rename. Articles and
-- lessons do not: they live as Markdown in git and credit their author by
-- HANDLE (`author: <username>` frontmatter), which the running site cannot
-- rewrite. So a rename used to empty the author's own profile (0 Articles,
-- 0 Tutorials) and leave every byline pointing at a handle they no longer own —
-- one that someone else could then claim and inherit the credit for.
--
-- content_author_handles is the missing link: a handle -> account map that the
-- site consults when resolving frontmatter. It is attribution only, never
-- routing, so a released handle stays free for anyone to take while the work
-- published under it still points home.
-- ==============================================================================

create table public.content_author_handles (
  handle text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index content_author_handles_profile_id_idx
  on public.content_author_handles (profile_id);

alter table public.content_author_handles enable row level security;

-- Readable by everyone (bylines render on public, anonymous pages), writable by
-- nobody: the only INSERT/DELETE path is the security-definer trigger below.
-- Without that asymmetry any signed-in user could insert
-- ('abdallah-shehawey', <their own id>) and walk off with the byline on every
-- article in the repo.
create policy "content_author_handles_select_all"
  on public.content_author_handles for select
  to anon, authenticated
  using (true);

create or replace function public.record_released_handle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The handle being given up now maps to the account giving it up. First
  -- release wins (`do nothing`): if the handle is already mapped, the content
  -- published under it belongs to whoever released it first, and a later
  -- holder must not be able to take that over by renaming through it.
  insert into public.content_author_handles (handle, profile_id)
  values (old.username, old.id)
  on conflict (handle) do nothing;

  -- Reclaiming a handle this same account released earlier: the live username
  -- covers it again, so the map entry is redundant. Scoped to profile_id so
  -- claiming a handle SOMEONE ELSE released never drops their attribution.
  delete from public.content_author_handles
  where handle = new.username and profile_id = new.id;

  return new;
end;
$$;

create trigger profiles_record_released_handle
  after update on public.profiles
  for each row
  when (old.username is distinct from new.username)
  execute function public.record_released_handle();

-- Joined and RLS-free (security_invoker = off) for the same reason as
-- profiles_public in 0008: bylines are read by the cookie-free anon client on
-- statically generated pages, and profiles' own select policy is owner/admin
-- only. Exposes nothing that profiles_public does not already.
create or replace view public.content_author_handles_public
with (security_invoker = off) as
select
  h.handle,
  p.id,
  p.username,
  p.display_name,
  p.avatar_url
from public.content_author_handles h
join public.profiles p on p.id = h.profile_id;

grant select on public.content_author_handles_public to anon, authenticated;

-- ------------------------------------------------------------------------------
-- Backfill: handles released BEFORE this migration existed left no trace, so
-- any that content still credits have to be reconnected by hand. Nothing to run
-- if no one has renamed yet.
--
--   insert into public.content_author_handles (handle, profile_id)
--   values ('old-handle', (select id from public.profiles where username = 'current-handle'))
--   on conflict (handle) do nothing;
-- ------------------------------------------------------------------------------
