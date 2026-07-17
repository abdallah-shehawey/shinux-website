# linux-blog

A personal Linux blog (articles + Q&A) built with Next.js. English-first (LTR) with
full Arabic (RTL) support. Production: https://shehaweyblog.vercel.app

> 📖 **صاحب الموقع:** اقرأ **[SETUP.md](./SETUP.md)** — دليل مفصّل بالعربية لكل ما تحتاجه.

## Tech stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS v4**
- **next-intl** for i18n — Arabic (default, RTL) and English (`/en`, LTR)
- Fonts: IBM Plex Sans Arabic (ar UI), Inter (en UI), JetBrains Mono (code)
- Dark mode by default, no-flash theme toggle (cookie-based)
- Installable PWA (web manifest + service worker + icons)
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
messages/                 translation JSON (ar.json, en.json)
public/                   icons, manifest source SVGs, service worker (sw.js)
src/
  i18n/                   next-intl routing / navigation / request config
  proxy.ts                locale middleware (Next 16 "proxy" convention)
  app/
    manifest.ts           PWA web app manifest
    [locale]/
      layout.tsx          html/body, fonts, theme, header/footer, metadata
      page.tsx            homepage
      not-found.tsx       localized 404
  components/             Header, Footer, ThemeToggle, ThemeScript,
                          LocaleSwitcher, ServiceWorkerRegister
```

## Internationalization

- English is the default and served at the root (`/`, `/articles`, …).
- Arabic is served under `/ar` (`/ar`, `/ar/articles`, …), rendered RTL.
- The root is deterministically English (no auto Accept-Language redirect); switch
  via the header's language button.
- Always import navigation from `@/i18n/navigation` (locale-aware `Link`), and use
  logical CSS utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`) so RTL/LTR both work.

## Adding a new article

✍️ Coming in **Phase 2** — articles will be Markdown/MDX files under
`content/articles/{ar,en}/`. This section will document the frontmatter and the
publish flow (add a file + `git push`).

---

Implementation follows [`Linux-site-spec.md`](./Linux-site-spec.md), phase by phase.
