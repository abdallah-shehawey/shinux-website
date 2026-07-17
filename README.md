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
- Planned: Supabase (auth + Postgres + RLS) for the Q&A system — Phase 3

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
```

> ⚠️ **Filesystem note:** this project must live on a POSIX filesystem (ext4).
> It is hosted at `~/My_Projects/Linux-website` with a symlink at the original
> `/media/Local-Disk2/...` path, because NTFS/FUSE mounts break Next.js builds
> (SIGBUS on mmap). See [SETUP.md](./SETUP.md) for details.

## Project structure

```
content/articles/         All articles, flat — one .md file per article (see below)
public/                   icons, manifest source SVGs, service worker (sw.js)
src/
  lib/
    articles.ts            reads content/articles, frontmatter, drafts, related, prev/next
    markdown.ts             reusable Markdown -> sanitized HTML pipeline (Shiki, TOC, slugs)
    site.ts                 site/author config (used by AuthorCard, /about)
  app/
    layout.tsx              html/body, fonts, theme, header/footer, metadata (always English/LTR)
    page.tsx                homepage (latest articles)
    not-found.tsx           404
    manifest.ts             PWA web app manifest
    rss.xml/route.ts        combined RSS feed
    about/page.tsx
    articles/page.tsx           list + tag filter (?tag=...)
    articles/[slug]/page.tsx    article page — TOC, reading time, prev/next, related;
                                 switches to RTL + Arabic font for that one article
                                 when its own frontmatter says locale: ar
  components/              Header, Footer, ThemeToggle, ThemeScript,
                           ServiceWorkerRegister, ArticleCard, AuthorCard,
                           TableOfContents, CopyCodeButtons
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

---

Implementation follows [`Linux-site-spec.md`](./Linux-site-spec.md), phase by phase.
