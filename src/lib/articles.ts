import "server-only";
import { cache } from "react";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

// ------------------------------------------------------------------------------
// File-based article source. Reads Markdown/MDX from a single flat directory:
//   content/articles/*.{md,mdx}
// The site's UI is English-only, but individual articles can be written in
// English or Arabic — the `locale` frontmatter field is used purely to render
// THAT article's own title/body with the right dir/lang (spec §4 frontmatter),
// it does not affect routing or the surrounding site chrome.
//
// An article can also ship in BOTH languages from a SINGLE file: list them with
// `locales: [en, ar]`, give `title`/`description` per-locale maps, pick the one
// shown first with `defaultLocale`, and separate the two bodies with
// `<!-- lang:en -->` / `<!-- lang:ar -->` markers. Such an article is one entry,
// one URL, and the reader flips languages with an in-page toggle.
//
// Drafts are shown in dev only and excluded from production builds.
// ------------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), "content", "articles");
const isProd = process.env.NODE_ENV === "production";

// One language's worth of an article's content.
export interface LocaleContent {
  title: string;
  description: string;
  body: string; // raw Markdown for this language (frontmatter/markers stripped)
  readingMinutes: number;
}

export interface ArticleMeta {
  slug: string;
  locale: string; // the DEFAULT content language ("en" | "ar")
  locales: string[]; // every language this article ships in, default first
  title: string; // default-language title
  description: string; // default-language description
  date: string; // YYYY-MM-DD
  tags: string[];
  cover?: string;
  draft: boolean;
  readingMinutes: number; // default-language reading time
  // Optional `author: <username>` frontmatter — a real account's username,
  // resolved to a live display_name/avatar via src/lib/authors.ts. Falls back
  // to the hardcoded siteAuthor (src/lib/site.ts) when absent or unresolved.
  author?: string;
}

export interface Article extends ArticleMeta {
  body: string; // default-language Markdown
  // Per-language content, keyed by locale. Single-language articles have one
  // entry; bilingual articles have one per declared locale.
  translations: Record<string, LocaleContent>;
}

function toISODate(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

// Only these languages are understood; anything else falls back to English.
function normalizeLocale(value: unknown): string | null {
  return value === "ar" ? "ar" : value === "en" ? "en" : null;
}

// Split a bilingual body into { locale: markdown } using `<!-- lang:xx -->`
// markers. Text before the first marker is ignored. Returns {} when there are
// no markers (i.e. the body isn't split by language).
function splitBodyByLocale(content: string): Record<string, string> {
  const re = /<!--\s*lang:\s*([a-zA-Z-]+)\s*-->/g;
  const matches = [...content.matchAll(re)];
  if (matches.length === 0) return {};

  const out: Record<string, string> = {};
  for (let i = 0; i < matches.length; i++) {
    const loc = matches[i][1].toLowerCase();
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end =
      i + 1 < matches.length ? (matches[i + 1].index ?? content.length) : content.length;
    out[loc] = content.slice(start, end).trim();
  }
  return out;
}

// A frontmatter field can be a single string (single-language article) or a
// per-locale map like { en: "...", ar: "..." } (bilingual article).
function pickLocalized(field: unknown, loc: string, fallback: string): string {
  if (field && typeof field === "object" && !Array.isArray(field)) {
    const value = (field as Record<string, unknown>)[loc];
    return typeof value === "string" ? value : fallback;
  }
  return typeof field === "string" ? field : fallback;
}

// React cache(): one filesystem scan + frontmatter parse per request, however
// many helpers below get called (an article page calls three of them).
const readAll = cache((): Article[] => {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const slug = file.replace(/\.mdx?$/, "");

      // Which languages does this article ship in? An explicit `locales` array
      // (length > 1) makes it bilingual; otherwise it's a single-language
      // article keyed off the legacy `locale` field.
      const declared = Array.isArray(data.locales)
        ? [
            ...new Set(
              data.locales
                .map(normalizeLocale)
                .filter((l): l is string => l !== null),
            ),
          ]
        : [];
      const localesRaw = declared.length > 0 ? declared : [normalizeLocale(data.locale) ?? "en"];
      const isBilingual = localesRaw.length > 1;

      // The language shown first when the article is opened (chosen in the .md).
      const requestedDefault = normalizeLocale(data.defaultLocale);
      const defaultLocale =
        requestedDefault && localesRaw.includes(requestedDefault)
          ? requestedDefault
          : localesRaw[0];
      // Default language first — drives the toggle order and the card language.
      const locales = [defaultLocale, ...localesRaw.filter((l) => l !== defaultLocale)];

      // Bodies per language. If the article claims to be bilingual but has no
      // markers, keep the whole body under the default language rather than
      // silently dropping it.
      let bodyByLocale = isBilingual ? splitBodyByLocale(content) : {};
      if (isBilingual && Object.keys(bodyByLocale).length === 0) {
        bodyByLocale = { [defaultLocale]: content };
      }

      const translations: Record<string, LocaleContent> = {};
      for (const loc of locales) {
        const body = isBilingual ? (bodyByLocale[loc] ?? "") : content;
        translations[loc] = {
          title: pickLocalized(data.title, loc, slug),
          description: pickLocalized(data.description, loc, ""),
          body,
          readingMinutes: Math.max(1, Math.round(readingTime(body).minutes)),
        };
      }

      const def = translations[defaultLocale];
      return {
        slug,
        locale: defaultLocale,
        locales,
        title: def.title,
        description: def.description,
        date: toISODate(data.date),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        cover: typeof data.cover === "string" ? data.cover : undefined,
        author: typeof data.author === "string" && data.author.trim() ? data.author.trim() : undefined,
        draft: data.draft === true,
        readingMinutes: def.readingMinutes,
        body: def.body,
        translations,
      } satisfies Article;
    })
    .filter((a) => !(isProd && a.draft)) // hide drafts in production
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
});

function stripBody(a: Article): ArticleMeta {
  const { body: _body, translations: _translations, ...meta } = a;
  void _body;
  void _translations;
  return meta;
}

/** All published articles (newest first), without bodies. */
export function getArticles(): ArticleMeta[] {
  return readAll().map(stripBody);
}

/** The N newest articles (for the homepage). */
export function getLatestArticles(n = 3): ArticleMeta[] {
  return getArticles().slice(0, n);
}

/**
 * Every article written by a given account — for public profiles.
 *
 * Takes a LIST of handles, not one username: frontmatter credits an author by
 * whatever handle they wrote under, and a rename does not rewrite git. The
 * caller passes the account's live username plus everything it has released
 * (src/lib/content-handles.ts), so renaming never empties a profile.
 */
export function getArticlesByAuthor(username: string | string[]): ArticleMeta[] {
  const handles = new Set(Array.isArray(username) ? username : [username]);
  return getArticles().filter((a) => !!a.author && handles.has(a.author));
}

/** A single article (with body), or null if not found / draft in production. */
export function getArticle(slug: string): Article | null {
  return readAll().find((a) => a.slug === slug) ?? null;
}

/** Unique tags across all articles, sorted. */
export function getAllTags(): string[] {
  const set = new Set<string>();
  for (const a of readAll()) a.tags.forEach((t) => set.add(t));
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Case-insensitive search across an article's title, description, tags, and
 * full body — every language's translation is checked, so a word inside the
 * Arabic half of a bilingual article still matches. Returns metas (no
 * bodies) sorted newest-first, same as getArticles().
 */
export function searchArticles(query: string): ArticleMeta[] {
  const term = query.trim().toLowerCase();
  if (!term) return getArticles();

  return readAll()
    .filter((a) => {
      const haystacks = [
        a.title,
        a.description,
        ...a.tags,
        ...Object.values(a.translations).flatMap((t) => [t.title, t.description, t.body]),
      ];
      return haystacks.some((h) => h.toLowerCase().includes(term));
    })
    .map(stripBody);
}

/** Related articles by tag overlap (most shared tags first), excluding self. */
export function getRelatedArticles(slug: string, limit = 3): ArticleMeta[] {
  const all = readAll();
  const current = all.find((a) => a.slug === slug);
  if (!current) return [];
  return all
    .filter((a) => a.slug !== slug)
    .map((a) => ({
      a,
      score: a.tags.filter((t) => current.tags.includes(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => stripBody(x.a));
}

/** Previous (newer) and next (older) article in the sorted list. */
export function getPrevNext(slug: string): {
  prev: ArticleMeta | null;
  next: ArticleMeta | null;
} {
  const all = readAll().map(stripBody);
  const i = all.findIndex((a) => a.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? all[i - 1] : null,
    next: i < all.length - 1 ? all[i + 1] : null,
  };
}
