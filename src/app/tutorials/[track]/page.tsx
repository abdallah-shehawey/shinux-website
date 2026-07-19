import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTracks, getTrack } from "@/lib/tutorials";
import { getAuthorProfiles } from "@/lib/authors";
import AuthorInline from "@/components/AuthorInline";

export function generateStaticParams() {
  return getTracks().map((t) => ({ track: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ track: string }>;
}): Promise<Metadata> {
  const { track } = await params;
  const found = getTrack(track);
  if (!found) return {};
  return { title: found.meta.title, description: found.meta.description };
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track } = await params;
  const found = getTrack(track);
  if (!found) notFound();
  const { meta, lessons } = found;
  const authors = await getAuthorProfiles(meta.authors);

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <Link href="/tutorials" className="text-sm text-muted hover:text-accent">
        &larr; All tutorials
      </Link>

      <header className="mb-8 mt-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{meta.title}</h1>
          {meta.tag && <span className="tag-chip">{meta.tag}</span>}
        </div>
        {meta.description && <p className="mt-2 text-muted">{meta.description}</p>}
        {meta.authors.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {meta.authors.map((username) => (
              <AuthorInline
                key={username}
                name={authors[username]?.name ?? username}
                username={username}
                avatar={authors[username]?.avatar}
              />
            ))}
          </div>
        )}
      </header>

      <ol className="grid auto-rows-fr gap-4 md:grid-cols-2">
        {lessons.map((lesson, i) => (
          <li key={lesson.slug}>
            <div className="card relative flex h-full items-start gap-4 transition-colors hover:border-accent">
              <Link
                href={`/tutorials/${track}/${lesson.slug}`}
                className="absolute inset-0 z-[1]"
                aria-label={lesson.title}
              />
              <span className="mt-0.5 font-mono text-sm text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex h-full flex-1 flex-col gap-1">
                <span className="line-clamp-2 font-medium text-fg">{lesson.title}</span>
                {lesson.description ? (
                  <span className="line-clamp-2 flex-1 text-sm text-muted">
                    {lesson.description}
                  </span>
                ) : (
                  <span className="flex-1" />
                )}
                <span className="font-mono text-xs text-muted">
                  {lesson.readingMinutes} min read
                </span>
                {lesson.author && authors[lesson.author] && (
                  <span className="relative z-[2] mt-1 border-t border-border pt-2 text-xs text-muted">
                    <AuthorInline
                      name={authors[lesson.author]?.name ?? lesson.author}
                      username={lesson.author}
                      avatar={authors[lesson.author]?.avatar}
                    />
                  </span>
                )}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
