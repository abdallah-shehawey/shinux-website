import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/articles";
import { getPublicQuestions } from "@/lib/questions";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;
  const articles = getArticles();
  const questions = await getPublicQuestions();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/articles`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/questions`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/ask`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/about`, changeFrequency: "yearly", priority: 0.3 },
  ];

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

  return [...staticRoutes, ...articleRoutes, ...questionRoutes];
}
