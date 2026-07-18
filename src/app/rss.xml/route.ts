import { getArticles } from "@/lib/articles";
import { getPublicQuestions } from "@/lib/questions";
import { site } from "@/lib/site";

// A combined feed of articles and answered questions (spec §4: "خلاصة RSS
// للمقالات والأسئلة المجابة"), sorted by date, newest first. Reading the
// live questions_public view means this route can't be static (force-static
// disallows the cookies()-based Supabase client) — it's server-rendered per
// request instead, same as the rest of the DB-backed pages.

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface FeedItem {
  title: string;
  url: string;
  date: string;
  description: string;
  tags: string[];
  locale: string;
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;

  const articleItems: FeedItem[] = getArticles().map((a) => ({
    title: a.title,
    url: `${siteUrl}/articles/${a.slug}`,
    date: a.date,
    description: a.description,
    tags: a.tags,
    locale: a.locale,
  }));

  const answeredQuestions = await getPublicQuestions({ limit: 50 }).catch(() => []);
  const questionItems: FeedItem[] = answeredQuestions
    .filter((q) => q.status === "answered")
    .map((q) => ({
      title: q.title,
      url: `${siteUrl}/questions/${q.slug}`,
      date: q.created_at,
      description: q.title,
      tags: q.tags,
      locale: q.locale,
    }));

  const items = [...articleItems, ...questionItems].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );

  const rssItems = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.url}</link>
      <guid>${item.url}</guid>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <description>${escapeXml(item.description)}</description>
      <category>${item.tags.map(escapeXml).join(", ")}</category>
      <language>${item.locale}</language>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${site.name}</title>
    <link>${siteUrl}</link>
    <description>Articles and answered questions about Linux and the terminal.</description>
    <language>en</language>
${rssItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
