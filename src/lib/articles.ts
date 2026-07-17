import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

// ------------------------------------------------------------------------------
// File-based article source. Reads Markdown/MDX from:
//   content/articles/{en,ar}/*.{md,mdx}
// Frontmatter (see spec §4):
//   title, description, date, tags, locale, draft, cover
// Drafts are shown in dev only and excluded from production builds.
// ------------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), "content", "articles");
const isProd = process.env.NODE_ENV === "production";

export interface ArticleMeta {
  slug: string;
  locale: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  tags: string[];
  cover?: string;
  draft: boolean;
  readingMinutes: number;
}

export interface Article extends ArticleMeta {
  body: string; // raw Markdown (frontmatter stripped)
}

function toISODate(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function readLocale(locale: string): Article[] {
  const dir = path.join(CONTENT_DIR, locale);
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const slug = file.replace(/\.mdx?$/, "");
      return {
        slug,
        locale,
        title: typeof data.title === "string" ? data.title : slug,
        description: typeof data.description === "string" ? data.description : "",
        date: toISODate(data.date),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        cover: typeof data.cover === "string" ? data.cover : undefined,
        draft: data.draft === true,
        readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
        body: content,
      } satisfies Article;
    })
    .filter((a) => !(isProd && a.draft)) // hide drafts in production
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function stripBody(a: Article): ArticleMeta {
  const { body: _body, ...meta } = a;
  void _body;
  return meta;
}

/** All published articles for a locale (newest first), without bodies. */
export function getArticles(locale: string): ArticleMeta[] {
  return readLocale(locale).map(stripBody);
}

/** The N newest articles for a locale (for the homepage). */
export function getLatestArticles(locale: string, n = 3): ArticleMeta[] {
  return getArticles(locale).slice(0, n);
}

/** A single article (with body), or null if not found / draft in production. */
export function getArticle(locale: string, slug: string): Article | null {
  return readLocale(locale).find((a) => a.slug === slug) ?? null;
}

/** Unique tags across a locale's articles, sorted. */
export function getAllTags(locale: string): string[] {
  const set = new Set<string>();
  for (const a of readLocale(locale)) a.tags.forEach((t) => set.add(t));
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Related articles by tag overlap (most shared tags first), excluding self. */
export function getRelatedArticles(
  locale: string,
  slug: string,
  limit = 3,
): ArticleMeta[] {
  const all = readLocale(locale);
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
export function getPrevNext(locale: string, slug: string): {
  prev: ArticleMeta | null;
  next: ArticleMeta | null;
} {
  const all = readLocale(locale).map(stripBody);
  const i = all.findIndex((a) => a.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? all[i - 1] : null,
    next: i < all.length - 1 ? all[i + 1] : null,
  };
}
