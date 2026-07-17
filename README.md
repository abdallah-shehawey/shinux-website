# linux-blog

A personal Linux blog (articles + Q&A) built with Next.js. English-first (LTR) with
full Arabic (RTL) support. Production: https://shehaweyblog.vercel.app

> 📖 **صاحب الموقع:** اقرأ **[SETUP.md](./SETUP.md)** — دليل مفصّل بالعربية لكل ما تحتاجه.

## Tech stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS v4**
- **next-intl** for i18n — English (default, LTR) and Arabic (`/ar`, RTL)
- Fonts: IBM Plex Sans Arabic (ar UI), Inter (en UI), JetBrains Mono (code)
- Dark mode by default, no-flash theme toggle (cookie-based)
- Installable PWA (web manifest + service worker + icons)
- Articles: plain Markdown files, `unified`/`remark`/`rehype` + Shiki (dual light/dark
  theme), sanitized HTML, auto TOC, reading time, RSS
- Planned: Supabase (auth + Postgres + RLS) for the Q&A system — Phase 3

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000  (ar: /, en: /en)
npm run build      # production build
npm start          # serve the production build
```

> ⚠️ **Filesystem note:** this project must live on a POSIX filesystem (ext4).
> It is hosted at `~/My_Projects/Linux-website` with a symlink at the original
> `/media/Local-Disk2/...` path, because NTFS/FUSE mounts break Next.js builds
> (SIGBUS on mmap). See [SETUP.md](./SETUP.md) for details.

## Project structure

```
content/articles/{en,ar}/ Markdown articles (see "Adding a new article" below)
messages/                 translation JSON (ar.json, en.json)
public/                   icons, manifest source SVGs, service worker (sw.js)
src/
  i18n/                   next-intl routing / navigation / request config
  proxy.ts                locale middleware (Next 16 "proxy" convention)
  lib/
    articles.ts            reads content/articles, frontmatter, drafts, related, prev/next
    markdown.ts             reusable Markdown -> sanitized HTML pipeline (Shiki, TOC, slugs)
    site.ts                 site/author config (used by AuthorCard, /about)
  app/
    manifest.ts            PWA web app manifest
    rss.xml/route.ts       combined RSS feed (both locales)
    [locale]/
      layout.tsx           html/body, fonts, theme, header/footer, metadata
      page.tsx             homepage (latest articles)
      not-found.tsx        localized 404
      about/page.tsx
      articles/page.tsx        list + tag filter (?tag=...)
      articles/[slug]/page.tsx article page (TOC, reading time, prev/next, related)
  components/              Header, Footer, ThemeToggle, ThemeScript, LocaleSwitcher,
                           ServiceWorkerRegister, ArticleCard, AuthorCard,
                           TableOfContents, CopyCodeButtons
```

## Internationalization

- English is the default and served at the root (`/`, `/articles`, …).
- Arabic is served under `/ar` (`/ar`, `/ar/articles`, …), rendered RTL.
- The root is deterministically English (no auto Accept-Language redirect); switch
  via the header's language button.
- Always import navigation from `@/i18n/navigation` (locale-aware `Link`), and use
  logical CSS utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`) so RTL/LTR both work.

## Adding a new article

1. Create a new file at `content/articles/en/your-slug.md` (or `content/articles/ar/your-slug.md`
   for Arabic). The **filename becomes the URL slug** — use lowercase, hyphens, no spaces.
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
   automatically. Code blocks always render left-to-right, even on Arabic pages.
   ```

3. Set `draft: true` while you're still writing — the article then only shows up
   locally (`npm run dev`), never on the live site. Flip it to `false` when ready.
4. `git add`, `git commit`, `git push` — Vercel rebuilds and publishes automatically.

Notes:
- `tags` drive both the `/articles` tag filter and the "related articles" section
  (articles sharing tags are suggested to each other) — reuse the same tag spelling
  across articles.
- `.mdx` files are also read, but only plain Markdown is rendered (no embedded JSX
  components yet) — stick to `.md` for now.
- There's no requirement that an English and Arabic article share a slug, but doing
  so (as the sample articles do) keeps things tidy if you ever add a language switch
  link on the article page itself.

---

Implementation follows [`Linux-site-spec.md`](./Linux-site-spec.md), phase by phase.
