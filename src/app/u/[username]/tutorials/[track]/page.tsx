import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile } from "@/lib/profiles";
import { getLessonsByAuthor, getTrack } from "@/lib/tutorials";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; track: string }>;
}): Promise<Metadata> {
  const { username, track } = await params;
  const profile = await getPublicProfile(username);
  const trackData = getTrack(track);
  if (!profile || !trackData) return {};
  return { title: `${trackData.meta.title} — Tutorials by ${profile.displayName}` };
}

export default async function ProfileTutorialsTrackPage({
  params,
}: {
  params: Promise<{ username: string; track: string }>;
}) {
  const { username, track } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const trackData = getTrack(track);
  if (!trackData) notFound();

  const lessons = getLessonsByAuthor(profile.username).filter((l) => l.track === track);
  if (lessons.length === 0) notFound();

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <Link href={`/u/${profile.username}/tutorials`} prefetch={true} scroll={false} className="text-sm text-muted hover:text-accent">
        &larr; Back to tutorials by {profile.displayName}
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold tracking-tight">{trackData.meta.title}</h1>
        <p className="mt-2 text-muted">
          {lessons.length} lesson{lessons.length === 1 ? "" : "s"} by {profile.displayName} in this track.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        {lessons.map((l) => (
          <Link
            key={l.slug}
            href={`/tutorials/${l.track}/${l.slug}`}
            className="card active:scale-[0.98] active:opacity-90 flex items-center justify-between gap-3 transition-colors hover:border-accent"
          >
            <span className="text-sm font-medium text-fg">{l.title}</span>
            <span className="tag-chip shrink-0">#{l.order}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
