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
  email magic link) and, from Phase 4 on, the Q&A system — Postgres + Row Level
  Security enforce the "anonymous question" privacy rule at the database level,
  not just in the UI

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
supabase/migrations/      0001_init.sql — schema, questions_public view, RLS, triggers
tests/rls/                anonymous-question.test.ts — the mandatory privacy test (vitest)
src/
  proxy.ts                 refreshes the Supabase session cookie on every request
  lib/
    articles.ts             reads content/articles, frontmatter, drafts, related, prev/next
    markdown.ts              reusable Markdown -> sanitized HTML pipeline (Shiki, TOC, slugs)
    site.ts                  site/author config (used by AuthorCard, /about)
    supabase/client.ts       Supabase client for Client Components
    supabase/server.ts       Supabase client for Server Components/Route Handlers (cookies)
  app/
    layout.tsx               html/body, fonts, theme, header/footer, metadata (always English/LTR)
    page.tsx                 homepage (latest articles)
    not-found.tsx            404
    manifest.ts              PWA web app manifest
    rss.xml/route.ts         combined RSS feed
    about/page.tsx
    login/page.tsx           GitHub / Google / email magic-link sign-in
    auth/callback/route.ts   exchanges the OAuth/magic-link code for a session
    me/page.tsx              basic account page + sign out
    articles/page.tsx            list + tag filter (?tag=...)
    articles/[slug]/page.tsx     article page — TOC, reading time, prev/next, related;
                                  switches to RTL + Arabic font for that one article
                                  when its own frontmatter says locale: ar
  components/               Header, Footer, ThemeToggle, ThemeScript, LoginForm,
                            SignOutButton, ServiceWorkerRegister, ArticleCard,
                            AuthorCard, TableOfContents, CopyCodeButtons
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
2. Run `supabase/migrations/0001_init.sql` once, in full, via the Supabase SQL
   Editor — it creates every table, the `questions_public` view, all RLS
   policies, and the new-user trigger in one shot. Then run
   `supabase/migrations/0002_avatar_storage.sql` the same way — it creates the
   `avatars` storage bucket (and its access policies) used for profile photos.
   Then `supabase/migrations/0003_profile_onboarding.sql` — adds the
   `onboarded` flag that routes first-time sign-ins through `/welcome` to
   review/edit the name, username, and avatar pulled from their provider
   before it's saved as final. Then `supabase/migrations/0004_profile_social_links.sql`
   — adds `social_links` (a free-form list, any platform, any number of
   entries) editable from `/me`.
3. Enable the GitHub and Google providers under Authentication → Providers,
   pointing their OAuth app callback URLs at the Callback URL Supabase shows you.
4. After your first sign-in, promote yourself to admin:
   `update public.profiles set role = 'admin' where username = 'your-username';`

Full step-by-step instructions (in Arabic, written for the site owner) are in
[SETUP.md](./SETUP.md).

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
