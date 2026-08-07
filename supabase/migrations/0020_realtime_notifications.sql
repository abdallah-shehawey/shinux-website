-- ==============================================================================
-- Live notifications.
--
-- The rows were always being created correctly — the reply, mention and
-- thread triggers from 0018 all fire. What was missing is any way for an open
-- tab to FIND OUT: the bell read its notifications once on mount and then not
-- again until it was clicked, so a notification that arrived while you were
-- reading only showed up if you happened to open the dropdown.
--
-- Postgres only streams changes for tables in the `supabase_realtime`
-- publication, and no table on this project had ever been added to it, so a
-- subscription would have connected happily and then received nothing at all.
--
-- Run this once via the Supabase SQL Editor, same as the earlier migrations.
-- Realtime still applies RLS per subscriber, and notifications_select_own
-- (0001) restricts every row to `user_id = auth.uid()` — so a subscriber is
-- only ever streamed their own notifications.
-- ==============================================================================

-- The publication exists on every Supabase project, but create it if this is
-- somehow a bare Postgres.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

-- Idempotent: adding a table twice raises "relation is already member".
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

-- Marking one read is an UPDATE, and with the default replica identity the old
-- row carries only the primary key — not enough for the subscriber's RLS check
-- to confirm the row is theirs, so the event is dropped and the badge does not
-- fall. FULL puts the whole row in the WAL. The table is small and short-lived,
-- so the extra WAL is not worth optimising away.
alter table public.notifications replica identity full;
