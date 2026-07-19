import type { Metadata } from "next";
import Link from "next/link";
import { getTracks, referenceRepos, searchLessons } from "@/lib/tutorials";
import { getAuthorProfiles } from "@/lib/authors";
import AuthorInline from "@/components/AuthorInline";

export const metadata: Metadata = { title: "Tutorials" };

export default async function TutorialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const tracks = getTracks();
  const authors = await getAuthorProfiles(tracks.flatMap((t) => t.authors));
  const results = q ? searchLessons(q) : [];

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tutorials</h1>
        <p className="mt-2 text-muted">
          Structured, multi-part write-ups from my study notes — Linux, DevOps,
          and embedded. Pick a track and work through it lesson by lesson.
        </p>
      </header>

      <form method="get" action="/tutorials" className="mb-8 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search lessons across every track&hellip;"
          className="w-full max-w-sm rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
        <button type="submit" className="btn-ghost">
          Search
        </button>
        {q && (
          <Link href="/tutorials" className="btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {q ? (
        results.length === 0 ? (
          <p className="text-muted">No lessons match your search.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {results.map((l) => (
              <Link
                key={`${l.track}/${l.slug}`}
                href={`/tutorials/${l.track}/${l.slug}`}
                className="card active:scale-[0.98] active:opacity-90 flex items-center justify-between gap-3 transition-colors hover:border-accent"
              >
                <span className="text-sm font-medium text-fg">{l.title}</span>
                <span className="tag-chip shrink-0">{l.trackTitle}</span>
              </Link>
            ))}
          </div>
        )
      ) : tracks.length === 0 ? (
        <p className="text-muted">No tutorials yet.</p>
      ) : (
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <div
              key={track.slug}
              className="card active:scale-[0.98] active:opacity-90 relative flex h-full flex-col gap-2 transition-colors hover:border-accent"
            >
              <Link
                href={`/tutorials/${track.slug}`}
                className="absolute inset-0 z-0"
                aria-label={track.title}
              />
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-fg">{track.title}</h2>
                {track.tag && <span className="tag-chip">{track.tag}</span>}
              </div>
              {track.description ? (
                <p className="line-clamp-2 flex-1 text-sm text-muted">{track.description}</p>
              ) : (
                <div className="flex-1" />
              )}
              <p className="mt-1 font-mono text-xs text-muted">
                {track.lessonCount} {track.lessonCount === 1 ? "lesson" : "lessons"}
              </p>
              {track.authors.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-muted">
                  {track.authors.map((username) => (
                    <AuthorInline
                      key={username}
                      name={authors[username]?.name ?? username}
                      username={username}
                      avatar={authors[username]?.avatar}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="mt-14">
        <h2 className="text-xl font-semibold">More resources</h2>
        <p className="mt-1 text-muted">
          Repos worth a look that live as code or PDFs rather than lessons — open
          them on GitHub.
        </p>
        <div className="mt-4 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {referenceRepos.map((repo) => (
            <a
              key={repo.href}
              href={repo.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card active:scale-[0.98] active:opacity-90 flex h-full flex-col gap-2 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-fg">{repo.title}</h3>
                <span className="tag-chip">{repo.tag}</span>
              </div>
              <p className="line-clamp-2 flex-1 text-sm text-muted">{repo.description}</p>
              <p className="mt-1 font-mono text-xs text-accent">View on GitHub &rarr;</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
