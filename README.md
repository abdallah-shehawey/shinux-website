# linux-blog

A personal Linux blog (articles + Q&A) built with Next.js. The site UI is
English-only; individual articles can be written in English or Arabic.
Production: https://shehaweyblog.vercel.app

> 📖 **صاحب الموقع:** اقرأ **[SETUP.md](./SETUP.md)** — دليل مفصّل بالعربية لكل ما تحتاجه.

## Tech stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS v4**
- English-only UI. Articles carry their own `locale` in frontmatter and render
  with the right `dir`/`lang`/font on their own page — the site chrome (header,
  footer, labels) never changes language.
- Fonts: Inter (UI + English articles), IBM Plex Sans Arabic (Arabic articles),
  JetBrains Mono (code)
- Dark mode by default, no-flash theme toggle (cookie-based)
- Installable PWA (web manifest + service worker + icons)
- Articles: plain Markdown files, `unified`/`remark`/`rehype` + Shiki (dual light/dark
  theme), sanitized HTML, auto TOC, reading time, RSS
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) for auth (GitHub, Google,
  email magic link) and the Q&A system — Postgres + Row Level Security enforce the
  "anonymous question" privacy rule at the database level, not just in the UI
- **Q&A system**: any signed-in user can ask (admin-reviewed before publishing)
  and any signed-in user can answer (published immediately) — a deliberate
  deviation from the spec's single-admin-answer design, so questions can have
  multiple answers. Notifications, upvotes ("Same question here"), search/tags,
  and an admin publish/reject queue at `/admin/questions` round it out.
- **SEO**: dynamic `sitemap.xml`/`robots.txt`, `Article`/`QAPage` JSON-LD,
  per-page OG images (`next/og`), privacy-respecting Vercel Analytics (no GA)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase credentials
npm run dev        # http://localhost:3000
npm run build      # production build
npm start           # serve the production build
npm run test:rls    # integration test: verifies anonymous questions never
                     # leak author_id via questions_public (needs a live
                     # Supabase project with supabase/migrations/0001_init.sql applied)
```

> ⚠️ **Filesystem note:** this project must live on a POSIX filesystem (ext4).
> It is hosted at `~/My_Projects/Linux-website` with a symlink at the original
> `/media/Local-Disk2/...` path, because NTFS/FUSE mounts break Next.js builds
> (SIGBUS on mmap). See [SETUP.md](./SETUP.md) for details.

## Project structure

```
content/articles/         All articles, flat — one .md file per article (see below)
public/                   icons, manifest source SVGs, service worker (sw.js)
scripts/seed-faq.mjs      one-off script: publishes the owner's FAQ notes as real Q&A
supabase/migrations/      0001_init.sql — schema, questions_public view, RLS, triggers
                          0002/0003/0004 — avatars, onboarding, social links
                          0005 — multi-answer answers RLS, counters, notification triggers
                          0006 — author_profiles view (DB-driven article bylines)
                          0007 — article_order table (admin pin-order for articles)
                          0008 — profiles_public view + author_username on questions_public
                                  (public profile pages, linkable question authors)
                          0009 — question_order table, answer_replies (+ view + notify
                                  trigger), notifies every admin on a new pending question
                          0010 — emails a copy of every notification via Resend + pg_net
                                  (needs a Vault secret — see SETUP.md)
tests/rls/                anonymous-question.test.ts — the mandatory privacy test (vitest)
src/
  proxy.ts                 refreshes the Supabase session cookie on every request
  lib/
    articles.ts             reads content/articles, frontmatter, drafts, related, prev/next,
                            search (title/description/tags/body, every locale)
    article-order.ts         admin pin-order lookup + the fallback-to-date-order merge
    question-order.ts        same, for questions (question_order table, keyed by id)
    authors.ts                resolves an article's `author: <username>` (or /about's own
                            author) to a live display_name/avatar via author_profiles
    profiles.ts               a user's public profile (profiles_public) for /u/[username]
    questions.ts             Q&A data layer — questions_public/answers_public/
                            answer_replies_public views, per-author question/answer lookups
    notifications.ts         a user's own notifications (server-only)
    notification-types.ts    shared type + label/href maps (client-safe, no "server-only")
    markdown.ts              reusable Markdown -> sanitized HTML pipeline (Shiki, TOC, slugs)
    slug.ts                  slugify() for question titles (Unicode-aware NFC, keeps Arabic)
    site.ts                  site/author config + social links (used by AuthorCard, /about,
                            sitemap, OG) — a social can be a single href or a `links[]` group
    supabase/client.ts       Supabase client for Client Components
    supabase/server.ts       Supabase client for Server Components/Route Handlers (cookies)
  app/
    layout.tsx               html/body, fonts, theme, header/footer, metadata, Analytics
    page.tsx                 homepage (pinned/latest articles + questions)
    error.tsx                generic error boundary
    not-found.tsx            404
    manifest.ts              PWA web app manifest
    sitemap.ts / robots.ts   dynamic SEO files (articles + published questions)
    opengraph-image.tsx      site-wide default OG image (next/og)
    rss.xml/route.ts         combined RSS feed
    api/render-markdown/     POST { body } -> { html }, backs the ask/answer preview tabs
    about/page.tsx            live bio + DB-driven avatar/name + social links (see site.ts)
    login/page.tsx           GitHub / Google / email magic-link sign-in
    auth/callback/route.ts   exchanges the OAuth/magic-link code for a session
    welcome/page.tsx         first-sign-in review of name/username/avatar
    me/page.tsx               account page: profile editor, notifications, your questions
    u/[username]/page.tsx     a user's public profile — avatar/name/socials + their public
                                  questions (skipped for the admin — see the file) + answers
    articles/page.tsx            list + search (?q=) + tag filter (?tag=...); admin-only
                                  drag-to-reorder toggle on the default (unfiltered) view
    articles/[slug]/page.tsx     article page — TOC, reading time, prev/next, related,
                                  Article JSON-LD, per-article OG image
    questions/page.tsx           archive — search (?q=) + tag filter; same admin reorder toggle
    questions/[slug]/page.tsx    question + all answers (+ replies, + reply form), upvote
                                  button, answer form, QAPage JSON-LD, per-question OG image
    ask/page.tsx                 ask form (redirects to /login?next=/ask if signed out)
    admin/questions/page.tsx     admin-only review queue: publish / reject
  components/               Header (nav + notification bell + admin link), Footer,
                            ThemeToggle, ThemeScript, LoginForm, SignOutButton,
                            ServiceWorkerRegister, ArticleCard, AuthorCard,
                            AuthorInline (small linked avatar+name, used across Q&A),
                            TableOfContents, CopyCodeButtons, QuestionCard, AskForm,
                            AnswerForm, ReplyForm, UpvoteButton, NotificationsList,
                            AdminQuestionsQueue, DragReorderList (generic drag-and-drop),
                            ArticleReorderGrid, QuestionReorderGrid
```

## Article language vs. site language

The site's UI (nav, buttons, labels) is always English. This is independent of
what language an *article* is written in:

- An article's frontmatter `locale: en` or `locale: ar` controls **only that
  article's own title/tags/body** — it renders RTL with the Arabic font when
  `ar`, LTR with Inter when `en`. Code blocks are always LTR regardless.
- Arabic articles get a small "AR" badge on their card and page so readers can
  tell before clicking.
- There is no `/en` or `/ar` URL prefix — every article lives at
  `/articles/your-slug` regardless of its content language.

## Adding a new article

1. Create a new file at `content/articles/your-slug.md`. The **filename becomes
   the URL slug** — use lowercase, hyphens, no spaces. All articles live in this
   one flat folder regardless of language.
2. Start the file with frontmatter, then write plain Markdown below it:

   ```markdown
   ---
   title: "Your Article Title"
   description: "One or two sentences shown in lists and search results."
   date: 2026-07-17
   tags: [arch, audio, pipewire]
   locale: en
   draft: false
   author: abdallah-shehawey
   ---

   Your content here. Headings (`##`, `###`), lists, tables, links, and fenced
   code blocks (` ```bash `) are all supported and get syntax highlighting
   automatically. Code blocks always render left-to-right.
   ```

   Set `locale: ar` (and write the title/body in Arabic) to publish an Arabic
   article — the page will render that article RTL automatically while the
   site's header/footer stay in English.

3. Set `draft: true` while you're still writing — the article then only shows up
   locally (`npm run dev`), never on the live site. Flip it to `false` when ready.
4. `git add`, `git commit`, `git push` — Vercel rebuilds and publishes automatically.

Notes:
- `author: <username>` is optional and resolves against `public.author_profiles`
  (a view of admin accounts — see `supabase/migrations/0006_author_profiles.sql`)
  so the byline and card avatar always reflect that account's *live*
  `display_name`/`avatar_url`, instead of the hardcoded `siteAuthor` in
  `src/lib/site.ts`. Omit it and the article falls back to `siteAuthor` exactly
  as before — nothing breaks. All 21 existing articles already have
  `author: abdallah-shehawey`.
- `tags` drive both the `/articles` tag filter and the "related articles" section
  (articles sharing tags are suggested to each other, regardless of language) —
  reuse the same tag spelling across articles.
- `.mdx` files are also read, but only plain Markdown is rendered (no embedded JSX
  components yet) — stick to `.md` for now.
- Slugs must be unique across the whole folder. If you're writing an Arabic and
  an English version of the same topic, suffix one (e.g. `my-topic.md` and
  `my-topic-ar.md`), as the sample articles do.

## Setting up Supabase (auth + database)

1. Copy `.env.example` to `.env.local` and fill in your Supabase project's URL,
   anon key, and service_role key (Project Settings → API in the Supabase dashboard).
2. Run every file in `supabase/migrations/` **in order**, once each, in full, via
   the Supabase SQL Editor: `0001_init.sql` (every table, the `questions_public`
   view, RLS, the new-user trigger) → `0002_avatar_storage.sql` (`avatars`
   storage bucket) → `0003_profile_onboarding.sql` (`onboarded` flag, routes
   first sign-ins through `/welcome`) → `0004_profile_social_links.sql`
   (`social_links`) → `0005_multi_answer_and_notifications.sql` (lets any
   signed-in user answer a published question instead of admin-only, adds the
   `upvote_count`/`answer_count` counters and the `answers_public` view, and
   wires up the notification triggers for publish/reject/answer events) →
   `0006_author_profiles.sql` (a public, admin-scoped view so article bylines
   can resolve a real `author: <username>` from the database — see below) →
   `0007_article_order.sql` (`article_order`: an optional explicit position
   per article slug, admin-writable, drives the drag-to-reorder toggle on
   `/articles`) → `0008_public_profiles.sql` (`profiles_public` view for
   `/u/[username]`, plus `author_username` on `questions_public` so a
   question's byline links somewhere) → `0009_question_order_replies_and_submit_notify.sql`
   (`question_order` — same pin-order idea as articles, for `/questions`;
   `answer_replies` + `answer_replies_public` — one-level-deep replies on an
   answer, with a notification trigger; a trigger notifying every admin when
   a question is actually submitted for review) →
   `0010_email_notifications.sql` (emails a copy of every notification via
   Resend, called directly from a trigger through the `pg_net` extension —
   no Edge Function needed. Inert until you run
   `select vault.create_secret('re_your_key', 'resend_api_key');` with your
   own Resend API key; see SETUP.md for the full walkthrough).
3. Enable the GitHub and Google providers under Authentication → Providers,
   pointing their OAuth app callback URLs at the Callback URL Supabase shows you.
4. After your first sign-in, promote yourself to admin:
   `update public.profiles set role = 'admin' where username = 'your-username';`
5. Optionally seed the FAQ archive (a batch of recurring beginner questions,
   pre-answered): `node scripts/seed-faq.mjs`. Idempotent — safe to re-run.

Full step-by-step instructions (in Arabic, written for the site owner) are in
[SETUP.md](./SETUP.md).

## The Q&A system

- Anyone signed in can **ask** at `/ask` (rate-limited to 5/hour) — every new
  question starts `pending` and is invisible to the public until an admin
  publishes it from `/admin/questions`. Asking "anonymously" hides your
  identity from the public (`questions_public` view nulls `author_id`/`avatar`)
  but never from the admin, and the DB enforces this — not the UI.
- Once published, **anyone signed in can answer** — not just the admin — so a
  question can accumulate multiple answers. The first answer flips a question's
  status to `answered`; both the asker and any other answerer get a
  notification (visible on `/me` and as a badge on "My account" in the header).
- `question_upvotes` backs the "Same question here" button; `answers_public`
  is the public-read view for answers (joins `profiles` for the answerer's
  name/avatar, same `security_invoker = off` trick as `questions_public`).
- Any signed-in user can **reply** to a specific answer (`answer_replies`) —
  a one-level-deep comment, not a second full answer. The answer's author
  gets notified.
- Every asker/answerer/replier's name+avatar is a link to their public
  profile at `/u/[username]` (`profiles_public`), which lists their public
  questions and answers. The admin's own profile skips "Questions asked" —
  the admin only ever asks a question as scaffolding to write its answer, so
  it's not a genuine personal question (see `src/app/u/[username]/page.tsx`).
- Both `/articles` and `/questions` have an admin-only **"Reorder"** toggle
  that switches the grid into a drag-and-drop list; the resulting order is
  what everyone sees (homepage + the listing page itself), and only applies
  to the default, unfiltered view — search/tag results stay in their natural
  order.
- Every notification (published/answered/rejected/submitted/reply) also gets
  emailed via Resend (see the Supabase setup steps above) — in-app
  notifications work regardless of whether that's configured.

### Verifying the anonymous-question privacy guarantee

```bash
npm run test:rls
```

This is the mandatory check from the spec: it creates a throwaway user and an
anonymous published question, then confirms that querying `questions_public`
as an anonymous client never returns `author_id` (or any other identifying
field) for that question — and that the raw `questions` table is unreachable
by anon entirely. It's a real integration test against your Supabase project
(RLS can't be meaningfully mocked), so it only runs once steps 1–2 above are done.

---

Implementation follows [`Linux-site-spec.md`](./Linux-site-spec.md), phase by phase.
