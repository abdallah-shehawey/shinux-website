import { getArticles } from "@/lib/articles";
import { routing } from "@/i18n/routing";
import { site } from "@/lib/site";

// A single combined feed across both locales (sorted by date), since the Q&A
// side (spec §4: "RSS للمقالات والأسئلة المجابة") doesn't exist yet — answered
// questions will be merged in here in Phase 4/5.
export const dynamic = "force-static";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;

  const items = routing.locales
    .flatMap((locale) =>
      getArticles(locale).map((a) => ({ ...a, locale })),
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const rssItems = items
    .map((item) => {
      const path = item.locale === routing.defaultLocale ? "" : `/${item.locale}`;
      const url = `${siteUrl}${path}/articles/${item.slug}`;
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <description>${escapeXml(item.description)}</description>
      <category>${item.tags.map(escapeXml).join(", ")}</category>
      <language>${item.locale}</language>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>linux-blog</title>
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
