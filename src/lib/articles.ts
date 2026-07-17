import "server-only";
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
// Drafts are shown in dev only and excluded from production builds.
// ------------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), "content", "articles");
const isProd = process.env.NODE_ENV === "production";

export interface ArticleMeta {
  slug: string;
  locale: string; // content language of this article ("en" | "ar")
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

function readAll(): Article[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const slug = file.replace(/\.mdx?$/, "");
      return {
        slug,
        locale: data.locale === "ar" ? "ar" : "en",
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

/** All published articles (newest first), without bodies. */
export function getArticles(): ArticleMeta[] {
  return readAll().map(stripBody);
}

/** The N newest articles (for the homepage). */
export function getLatestArticles(n = 3): ArticleMeta[] {
  return getArticles().slice(0, n);
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
