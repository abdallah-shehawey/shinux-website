-- ==============================================================================
-- linux-blog — Phase 4/5: multi-answer model, aggregate counters, notifications
-- ------------------------------------------------------------------------------
-- Deviates from the single-admin-answer design in Linux-site-spec.md §3, per
-- the owner's explicit direction: ANY signed-in user may answer a published
-- question (not just the admin), answers publish immediately, and a question
-- can accumulate multiple answers.
--
-- Also fixes a latent RLS bug from 0001_init.sql: `answers_select_public`'s
-- `exists (select 1 from questions ...)` subquery is itself subject to the
-- `questions` table's own RLS policy (author-or-admin only, no anon policy at
-- all), so it silently matched nothing for anon/other users — public answer
-- reads never actually worked. Fixed with a SECURITY DEFINER helper, same
-- pattern as is_admin().
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper: is a question currently visible to the public?
-- ------------------------------------------------------------------------------

create or replace function public.is_question_visible(qid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.questions
    where id = qid and status in ('published', 'answered')
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. Denormalized counters (avoid N+1 counting queries on list/detail pages).
-- ------------------------------------------------------------------------------

alter table public.questions add column if not exists upvote_count integer not null default 0;
alter table public.questions add column if not exists answer_count integer not null default 0;

-- ------------------------------------------------------------------------------
-- 3. answers: replace admin-only write policies + fix the public read policy.
-- ------------------------------------------------------------------------------

drop policy if exists "answers_select_public" on public.answers;
create policy "answers_select_public"
  on public.answers for select
  to anon, authenticated
  using (public.is_admin() or public.is_question_visible(question_id));

drop policy if exists "answers_insert_admin_only" on public.answers;
create policy "answers_insert_authenticated"
  on public.answers for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_question_visible(question_id));

drop policy if exists "answers_update_admin_only" on public.answers;
create policy "answers_update_own_or_admin"
  on public.answers for update
  to authenticated
  using (public.is_admin() or author_id = auth.uid())
  with check (public.is_admin() or author_id = auth.uid());

drop policy if exists "answers_delete_admin_only" on public.answers;
create policy "answers_delete_own_or_admin"
  on public.answers for delete
  to authenticated
  using (public.is_admin() or author_id = auth.uid());

-- Tighten upvotes to only ever target a publicly-visible question.
drop policy if exists "question_upvotes_insert_own" on public.question_upvotes;
create policy "question_upvotes_insert_own"
  on public.question_upvotes for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_question_visible(question_id));

-- ------------------------------------------------------------------------------
-- 4. Public view for answers (needs to join profiles for the answerer's name/
--    avatar, which regular users cannot otherwise SELECT — same technique as
--    questions_public: security_invoker = off bypasses the underlying RLS).
--    Answers are never anonymous, so no hiding logic here.
-- ------------------------------------------------------------------------------

create or replace view public.answers_public
with (security_invoker = off) as
select
  a.id, a.question_id, a.body, a.is_accepted, a.created_at, a.author_id,
  p.display_name as author_display,
  p.avatar_url as author_avatar,
  p.username as author_username
from public.answers a
join public.profiles p on p.id = a.author_id
where public.is_question_visible(a.question_id);

grant select on public.answers_public to anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. Side effects on answer insert/delete: keep answer_count in sync, flip a
--    "published" question to "answered" on its first answer (and back on its
--    last answer being removed), and notify the question's author (skip
--    self-notification when someone answers their own question).
-- ------------------------------------------------------------------------------

create or replace function public.handle_answer_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.questions%rowtype;
begin
  if tg_op = 'INSERT' then
    select * into q from public.questions where id = new.question_id;

    update public.questions
      set answer_count = answer_count + 1,
          status = case when status = 'published' then 'answered' else status end
      where id = new.question_id;

    if q.author_id is not null and q.author_id <> new.author_id then
      insert into public.notifications (user_id, type, payload)
      values (
        q.author_id,
        'question_answered',
        jsonb_build_object(
          'question_id', q.id,
          'question_slug', q.slug,
          'question_title', q.title,
          'answer_id', new.id
        )
      );
    end if;

    return new;

  elsif tg_op = 'DELETE' then
    update public.questions
      set answer_count = greatest(answer_count - 1, 0),
          status = case
            when status = 'answered' and answer_count <= 1 then 'published'
            else status
          end
      where id = old.question_id;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists answers_after_change on public.answers;
create trigger answers_after_change
  after insert or delete on public.answers
  for each row execute function public.handle_answer_change();

-- ------------------------------------------------------------------------------
-- 6. Upvote counter.
-- ------------------------------------------------------------------------------

create or replace function public.handle_upvote_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.questions set upvote_count = upvote_count + 1 where id = new.question_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.questions set upvote_count = greatest(upvote_count - 1, 0) where id = old.question_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists question_upvotes_after_change on public.question_upvotes;
create trigger question_upvotes_after_change
  after insert or delete on public.question_upvotes
  for each row execute function public.handle_upvote_change();

-- ------------------------------------------------------------------------------
-- 7. Notify a question's author when the admin publishes or rejects it.
-- ------------------------------------------------------------------------------

create or replace function public.handle_question_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and old.status = 'pending' then
    if new.status = 'published' then
      insert into public.notifications (user_id, type, payload)
      values (
        new.author_id,
        'question_published',
        jsonb_build_object('question_id', new.id, 'question_slug', new.slug, 'question_title', new.title)
      );
    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, type, payload)
      values (
        new.author_id,
        'question_rejected',
        jsonb_build_object('question_id', new.id, 'question_title', new.title)
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists questions_after_status_update on public.questions;
create trigger questions_after_status_update
  after update on public.questions
  for each row execute function public.handle_question_status_change();

-- ------------------------------------------------------------------------------
-- 8. Rebuild questions_public to expose the new counters.
--
-- `create or replace view` only allows APPENDING columns, never inserting or
-- reordering them (Postgres errors: "cannot change name of view column ...")
-- — so the two new counter columns must go at the very end, after the
-- existing ones in their original 0001_init.sql order.
-- ------------------------------------------------------------------------------

create or replace view public.questions_public
with (security_invoker = off) as
select
  q.id, q.title, q.body, q.locale, q.status, q.slug, q.tags, q.created_at,
  q.is_anonymous,
  case when q.is_anonymous then null else q.author_id end as author_id,
  case when q.is_anonymous then 'Anonymous user' else p.display_name end as author_display,
  case when q.is_anonymous then null else p.avatar_url end as author_avatar,
  q.upvote_count, q.answer_count
from public.questions q
join public.profiles p on p.id = q.author_id
where q.status in ('published', 'answered');

grant select on public.questions_public to anon, authenticated;
