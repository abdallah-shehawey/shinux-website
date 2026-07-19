# PRE-LAUNCH TASK: Verify the site works end-to-end AND make content pages open fast

The site is about to launch publicly. Two goals, in this order of importance:

1. **Content pages (Articles, Questions, Tutorials) must open near-instantly.** Right now there is a noticeable delay between clicking a card and seeing the page. This is the #1 issue — treat any noticeable click-to-content delay as a bug with a root cause, not as normal behavior.
2. **Verify every feature still works correctly** after the optimizations — nothing may break.

Do NOT guess. Measure, find the real bottleneck, fix the root cause, then measure again.

---

## Project-specific architecture (use this — don't rediscover it from scratch)

This is a Next.js 16 App Router project. The three content types are NOT the same, so investigate them differently:

**Articles & Tutorials — file-based (Markdown in `content/`), no database:**

- Data layer: `src/lib/articles.ts` and `src/lib/tutorials.ts`, both using React `cache()` per request.
- Article pages render every locale's Markdown through Shiki (`src/lib/markdown.ts`), then call `getAuthorProfiles()` which hits Supabase.
- Key questions to answer:
  - Are `/articles/[slug]` and `/tutorials/[track]/[lesson]` **statically generated** (via `generateStaticParams`) or dynamically rendered on every request? If dynamic — why? Is anything (e.g. the Supabase author lookup, `cookies()` leaking in through a shared import) forcing them dynamic?
  - How expensive is the Shiki/Markdown render per request? If pages are dynamic, this cost is paid on every single view — it should be paid once at build time or cached.
  - `readAll()` re-reads and re-parses the entire content directory — confirm React `cache()` actually contains this to one walk per request, and that it never runs per-component.
  - Can these pages be fully static (SSG) with the author profile either baked in at build time or revalidated with ISR? That is the ideal end state for file-based public content.

**Questions — Supabase-backed (`questions_public` / `answers_public` views, RLS):**

- Data layer: `src/lib/questions.ts`. Public thread reads already go through `unstable_cache` with the cookie-free anon client (`src/lib/supabase/anon.ts`); the page fetches thread + `getCurrentUser()` in parallel.
- Key questions to answer:
  - Measure the **cache-miss path**: how long does `getQuestionThread()` take when the Next data cache is cold? Break it down: Supabase round-trip(s) vs. Markdown rendering of question + all answers + all replies.
  - Are the queries inside a thread fetch (question, answers, replies, upvote state) parallel where independent? Any N+1 pattern (e.g. one query per answer for its replies)?
  - Do the views/tables have indexes on `slug` and the join/filter columns actually used? Check the real query patterns in `supabase/migrations/` first — do not add indexes blindly.
  - For **anonymous visitors** (the majority after launch): confirm the page does zero session-scoped Supabase calls and serves entirely from the data cache. Verify `revalidateQuestionCaches()` still busts the cache correctly on publish/answer/reply so content never goes stale.

**Shared per-request cost — check this affects ALL pages:**

- `src/proxy.ts` runs on every request. It already skips the Supabase round-trip for anonymous visitors — verify that skip actually works in production (no auth cookie → no network hop). For signed-in users, measure how much the `auth.getUser()` refresh adds to every navigation and whether it can be made non-blocking for public content.
- `getCurrentUser()` in `src/lib/supabase/server.ts` is request-deduped — confirm the Header, `generateMetadata`, and the page really share one lookup and nothing bypasses the `cache()` wrapper.

---

## Measurement protocol (do this BEFORE and AFTER changes)

The metric is **click-to-content latency**, not homepage load:

1. Run a **production build** (`next build` + `next start`). Development mode numbers are meaningless here — never draw conclusions from dev mode.
2. For each of: one Article, one Question (with several answers), one Tutorial lesson — measure and report:
   - TTFB of the route
   - Whether the route is ○ (static), ● (SSG), or ƒ (dynamic) in the build output — paste the relevant build output table
   - Time from clicking the card to meaningful content visible
3. Test cold vs. warm: first request after server start vs. repeat navigation. If cold is much slower, identify exactly why (cold data cache? Supabase connection? Shiki init?).
4. Test the realistic flow: Home → Article A → Back → Question A → Back → Tutorial lesson → Article B. Previously visited pages must not redo expensive work. Check that `<Link>` prefetching is active for the cards and not disabled anywhere.
5. **Scroll behavior — verify it is correct across ALL navigation, on desktop and mobile:**
   - Navigating to a NEW page (card → article/question/lesson) must land at the **top** of the page — never at the previous page's scroll position.
   - **Back/forward navigation must restore the previous scroll position** — e.g. scroll down a long listing, open an item, press Back → you're back at the same spot in the list, not at the top. Same for browser forward.
   - TOC / anchor links (`#heading`) must scroll to the correct heading with the right offset (heading not hidden under any sticky header), and the URL hash must update. Opening a URL with a hash directly must also land on the right section.
   - The TOC's active-section highlight (if present) must track scrolling correctly.
   - Sticky/fixed elements (header, tutorial sidebar, TOC) must not overlap content, must not jitter while scrolling, and the sidebar itself must scroll independently when its content is taller than the viewport.
   - No scroll-jumping or layout shift while a page loads (images/fonts/late-rendering content pushing the page around mid-read) — check long articles with many code blocks and images.
   - RTL (Arabic) pages must scroll and position anchors/TOC just as correctly as LTR.
   - After a search or tag filter on `/articles` or `/questions`, the scroll position behaves sensibly (results start from the top).
   - Report any scroll bug found, fix it, and re-verify.
6. Report the before/after numbers in a table. If a change didn't measurably help, say so and revert it.

---

## Rules

- **No fake speed.** Do not "fix" this with earlier skeletons, removed spinners, or shorter transitions. Reduce real latency first; loading-UI polish is secondary.
- **No correctness regressions.** Do not weaken auth/RLS, do not cache session-scoped or private data, do not let stale content survive after a question is published/answered (the tag-based revalidation must keep working), do not break SEO metadata, RSS, sitemap, or the anonymous-question privacy guarantee (`npm run test:rls` must still pass).
- Prefer, in order, for public content: static generation → ISR/tag revalidation → cached server fetch. Only stay fully dynamic where genuinely required, and explain why.
- Every optimization must state: what was slow, why, what changed, and the measured improvement.

---

## Verify the recently added features were actually implemented — completely and correctly

A set of new features was requested in previous sessions. For EACH item below, check the codebase and the running production build: confirm it exists, works, and matches the spec. If any item is missing or half-done, **finish it now** as part of this task. Report per-item: ✅ done / ⚠️ partial (what's missing) / ❌ not implemented (then implement it).

**1. Personalized Linux-themed home page:**

- The home page presents this as the owner's personal blog, with a Linux/terminal-flavored identity section (e.g. `whoami`, `uname`, `cat`-style presentation of who he is) reflecting his love of Linux and open source.
- The personal info shown is sourced from the About page / the owner's profile data — not duplicated hardcoded text that can drift out of sync.

**2. MkDocs-Material-style tutorial experience (built inside Next.js, NOT a separate mkdocs build):**

- Persistent sidebar on tutorial lesson pages listing all lessons in the current track, with the current lesson highlighted.
- Search across tutorials (like the existing articles search).
- Admonitions in Markdown (NOTE / TIP / WARNING / etc. callout boxes) rendered site-wide wherever Markdown is rendered — articles, tutorials, questions/answers.
- Tabbed code blocks component.
- Confirm these render correctly in BOTH themes (light/dark) and in RTL Arabic content, and that the sanitization pipeline in `src/lib/markdown.ts` doesn't strip them.

**3. Reading experience / typography:**

- Article, tutorial, and question body typography is comfortable and readable (line length, spacing, font sizes, heading hierarchy) — not cramped journal-style text. Verify on mobile and desktop, LTR and RTL.

**4. Public profile page (`/u/[username]`) content cards:**

- **Articles card**: shows the count of articles this user authored; opens/expands to list all their articles.
- **Tutorials card(s)**: grouped by track as folder-style cards (e.g. "Linux Admin — N lessons"), NOT a flat dump of every lesson. Each track card shows only when the user authored lessons in it, shows the count of THEIR lessons, and opens to list only THEIR lessons in that track.
- **Questions card**: contains two sub-cards — "Questions asked" and "Questions answered" — each with its count, each opening to the corresponding list.
- **Strict scoping (critical)**: every card shows ONLY content this specific user authored. No leakage of other users' content, no pending/rejected/draft content, and the anonymous-question privacy guarantee still holds (anonymous questions never appear attributed on a public profile). The existing rule that the admin's own profile hides "Questions asked" must be preserved.
- Counts on the cards must match the actual number of items inside them.

**5. Regression check on the above:** the new home page, sidebar, admonitions, tabs, and profile cards must not have degraded the click-to-content latency you just optimized — include them in the after-measurements.

---

## Final verification sweep (after performance work)

Run through the whole site in the production build and confirm each of these still works:

- Sign in (GitHub / Google / magic link) → `/welcome` flow → `/me` profile edit
- Ask a question → appears in admin queue → publish → visible publicly → answer it → asker notified → reply to the answer → answerer notified
- Anonymous question: identity hidden publicly, visible to admin; `npm run test:rls` passes
- Upvote button, answer/reply forms, Markdown preview (`/api/render-markdown`)
- Article page: TOC, language toggle (ar/en), prev/next, related, copy-code buttons, reading time
- Tutorial track page ordering and lesson prev/next
- Search + tag filters on `/articles` and `/questions`; admin drag-reorder on both
- Scroll behavior end-to-end: top-of-page on new navigation, scroll restoration on Back/Forward, anchor/TOC links land correctly under sticky headers, no layout shift on long pages — desktop + mobile, LTR + RTL
- Public profile `/u/[username]`, About page, RSS (`/rss.xml`), sitemap, robots, OG images, 404 page, theme toggle, PWA/service worker
- `npm run build` completes clean, and `npm run test:rls` passes

Report: the before/after latency table, every change made with its justification, the per-item status of the "recently added features" section (✅/⚠️/❌, with anything missing now implemented), and a checklist of the verification sweep with pass/fail per item.
