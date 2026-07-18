-- ==============================================================================
-- linux-blog — public author lookup for article bylines
-- ------------------------------------------------------------------------------
-- Article frontmatter can reference a real account via `author: <username>`
-- (see src/lib/articles.ts) so the "Written by" byline pulls a live
-- display_name/avatar from the database instead of a hardcoded value.
--
-- Scoped to admins only (articles are still admin-authored per
-- Linux-site-spec.md §1) — this deliberately does NOT expose every registered
-- user's profile the way answers_public exposes answerers (who chose to post
-- publicly); it only ever resolves the handful of accounts the site owner
-- already trusts to be bylined.
-- ==============================================================================

create or replace view public.author_profiles
with (security_invoker = off) as
select id, username, display_name, avatar_url
from public.profiles
where role = 'admin';

grant select on public.author_profiles to anon, authenticated;
