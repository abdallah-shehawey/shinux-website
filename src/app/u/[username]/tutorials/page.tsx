import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile, getCachedPublicProfileUsernames } from "@/lib/profiles";
import { getLessonsByAuthor, getTracks } from "@/lib/tutorials";

// Public and viewer-independent, like the profile page it hangs off: rendered
// once and served from the cache, not rebuilt per request. See
// src/app/u/[username]/page.tsx.
export const revalidate = 3600;

export async function generateStaticParams() {
  const usernames = await getCachedPublicProfileUsernames().catch(() => []);
  return usernames.map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return {};
  return { title: `Tutorials by ${profile.displayName}` };
}

export default async function ProfileTutorialsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const lessons = getLessonsByAuthor(profile.username);

  // Group by track, in the same order the tracks appear on the tutorials hub,
  // rather than a flat list — mirrors opening a track and seeing just its lessons.
  const groups = getTracks()
    .map((t) => ({
      slug: t.slug,
      title: t.title,
      lessons: lessons.filter((l) => l.track === t.slug),
    }))
    .filter((g) => g.lessons.length > 0);

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <Link href={`/u/${profile.username}`} className="text-sm text-muted hover:text-accent">
        &larr; Back to profile
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold tracking-tight">Tutorials by {profile.displayName}</h1>
      </header>

      {groups.length === 0 ? (
        <p className="text-muted">No public tutorials yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={g.slug}
              href={`/u/${profile.username}/tutorials/${g.slug}`}
              className="card active:scale-[0.98] active:opacity-90 flex flex-col gap-1 transition-colors hover:border-accent"
            >
              <h2 className="font-semibold text-fg">{g.title}</h2>
              <p className="text-sm text-muted">
                {g.lessons.length} lesson{g.lessons.length === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
