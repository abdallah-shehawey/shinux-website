import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile } from "@/lib/profiles";
import { getArticlesByAuthor } from "@/lib/articles";
import { getAuthorProfiles } from "@/lib/authors";
import ArticleCard from "@/components/ArticleCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return {};
  return { title: `Articles by ${profile.displayName}` };
}

function readingLabel(minutes: number) {
  return `${minutes} min read`;
}

export default async function ProfileArticlesPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const articles = getArticlesByAuthor(profile.username);
  const authors = await getAuthorProfiles(
    articles.map((a) => a.author).filter((a): a is string => Boolean(a)),
  );

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <Link href={`/u/${profile.username}`} className="text-sm text-muted hover:text-accent">
        &larr; Back to profile
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold tracking-tight">Articles by {profile.displayName}</h1>
      </header>

      {articles.length === 0 ? (
        <p className="text-muted">No public articles yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard
              key={a.slug}
              article={a}
              readingLabel={readingLabel(a.readingMinutes)}
              author={a.author ? authors[a.author] : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
