-- ==============================================================================
-- Onboarding: new sign-ups review/edit the name, username, and avatar we
-- derived from their OAuth provider (at /welcome) before it's treated as
-- final. Existing profiles already went through first sign-in for real, so
-- they're backfilled as already-onboarded and won't be sent there again.
-- Run this once via the Supabase SQL Editor, same as 0001/0002.
-- ==============================================================================

alter table public.profiles add column onboarded boolean not null default false;

update public.profiles set onboarded = true;
