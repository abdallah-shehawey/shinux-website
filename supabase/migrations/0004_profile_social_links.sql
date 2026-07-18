-- ==============================================================================
-- Social links: a free-form list a user can fill in from /me — any number of
-- entries, including more than one of the same platform (e.g. two Facebook
-- accounts) or a custom "Other" entry. Stored as a JSON array of
-- {platform, label, url} objects; nothing here is required.
-- Run this once via the Supabase SQL Editor, same as 0001/0002/0003.
-- ==============================================================================

alter table public.profiles
  add column social_links jsonb not null default '[]'::jsonb;
