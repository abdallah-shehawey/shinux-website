-- ==============================================================================
-- linux-blog — admin-controlled question order, replies-to-answers, and a
-- "new question submitted" notification for the admin.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Admin-controlled question display order (mirrors article_order, 0007).
-- ------------------------------------------------------------------------------

create table public.question_order (
  question_id uuid primary key references public.questions(id) on delete cascade,
  position integer not null,
  updated_at timestamptz not null default now()
);

alter table public.question_order enable row level security;

create policy "question_order_select_public"
  on public.question_order for select
  to anon, authenticated
  using (true);

create policy "question_order_insert_admin_only"
  on public.question_order for insert
  to authenticated
  with check (public.is_admin());

create policy "question_order_update_admin_only"
  on public.question_order for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "question_order_delete_admin_only"
  on public.question_order for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 2. Replies to an answer (a lightweight comment thread, one level deep —
--    not a second full answer). Anyone signed in may reply; visibility
--    follows the parent answer's question the same way answers do.
-- ------------------------------------------------------------------------------

create table public.answer_replies (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.answer_replies enable row level security;

create policy "answer_replies_select_public"
  on public.answer_replies for select
  to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.answers a
      where a.id = answer_replies.answer_id
        and public.is_question_visible(a.question_id)
    )
  );

create policy "answer_replies_insert_authenticated"
  on public.answer_replies for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.answers a
      where a.id = answer_replies.answer_id
        and public.is_question_visible(a.question_id)
    )
  );

create policy "answer_replies_delete_own_or_admin"
  on public.answer_replies for delete
  to authenticated
  using (public.is_admin() or author_id = auth.uid());

-- Public read view, same author-join technique as answers_public.
create or replace view public.answer_replies_public
with (security_invoker = off) as
select
  r.id, r.answer_id, r.body, r.created_at, r.author_id,
  p.display_name as author_display,
  p.avatar_url as author_avatar,
  p.username as author_username
from public.answer_replies r
join public.profiles p on p.id = r.author_id
join public.answers a on a.id = r.answer_id
where public.is_question_visible(a.question_id);

grant select on public.answer_replies_public to anon, authenticated;

-- Notify the answer's author when someone replies (skip replying to your own answer).
create or replace function public.handle_reply_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ans public.answers%rowtype;
  q public.questions%rowtype;
begin
  select * into ans from public.answers where id = new.answer_id;
  select * into q from public.questions where id = ans.question_id;

  if ans.author_id is not null and ans.author_id <> new.author_id then
    insert into public.notifications (user_id, type, payload)
    values (
      ans.author_id,
      'answer_reply',
      jsonb_build_object(
        'question_id', q.id,
        'question_slug', q.slug,
        'question_title', q.title,
        'answer_id', ans.id,
        'reply_id', new.id
      )
    );
  end if;

  return new;
end;
$$;

create trigger answer_replies_after_insert
  after insert on public.answer_replies
  for each row execute function public.handle_reply_insert();

-- ------------------------------------------------------------------------------
-- 3. Notify every admin when a new question is submitted and actually needs
--    review, so they know to check /admin/questions. Skip if the admin
--    submitted it themselves (their own questions are just answer-scaffolding
--    — see src/app/u/[username]/page.tsx) and skip anything inserted with a
--    status other than 'pending' (e.g. the RLS test in tests/rls inserts
--    status: 'published' directly via service_role — that's not a real
--    submission needing review, so it must not spam the admin).
-- ------------------------------------------------------------------------------

create or replace function public.handle_question_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  select p.id, 'question_submitted',
    jsonb_build_object('question_id', new.id, 'question_title', new.title)
  from public.profiles p
  where p.role = 'admin' and p.id <> new.author_id;
  return new;
end;
$$;

create trigger questions_after_insert
  after insert on public.questions
  for each row
  when (new.status = 'pending')
  execute function public.handle_question_insert();
