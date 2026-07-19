import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/articles";
import { getCachedPublicQuestions } from "@/lib/questions";
import { getTracks, getAllLessonParams } from "@/lib/tutorials";
import { site } from "@/lib/site";

// Static with periodic regeneration: question URLs come from the cookie-free
// cached read, so crawlers never trigger a live Supabase query. An empty
// question section (Supabase briefly down) beats failing the whole sitemap.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;
  const articles = getArticles();
  const questions = await getCachedPublicQuestions().catch(() => []);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/articles`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/tutorials`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/questions`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/ask`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/about`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const trackRoutes: MetadataRoute.Sitemap = getTracks().map((t) => ({
    url: `${siteUrl}/tutorials/${t.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const lessonRoutes: MetadataRoute.Sitemap = getAllLessonParams().map(({ track, lesson }) => ({
    url: `${siteUrl}/tutorials/${track}/${lesson}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${siteUrl}/articles/${a.slug}`,
    lastModified: a.date,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const questionRoutes: MetadataRoute.Sitemap = questions.map((q) => ({
    // encodeURIComponent: question slugs can be Arabic; sitemap URLs must be
    // percent-encoded per the protocol, unlike article slugs which are
    // always plain ASCII already.
    url: `${siteUrl}/questions/${encodeURIComponent(q.slug)}`,
    lastModified: q.created_at,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...trackRoutes, ...lessonRoutes, ...articleRoutes, ...questionRoutes];
}
