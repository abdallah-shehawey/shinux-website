import type { Metadata } from "next";
import Link from "next/link";
import { getTracks, referenceRepos } from "@/lib/tutorials";

export const metadata: Metadata = { title: "Tutorials" };

export default function TutorialsPage() {
  const tracks = getTracks();

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tutorials</h1>
        <p className="mt-2 text-muted">
          Structured, multi-part write-ups from my study notes — Linux, DevOps,
          and embedded. Pick a track and work through it lesson by lesson.
        </p>
      </header>

      {tracks.length === 0 ? (
        <p className="text-muted">No tutorials yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <Link
              key={track.slug}
              href={`/tutorials/${track.slug}`}
              className="card flex flex-col gap-2 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-fg">{track.title}</h2>
                {track.tag && <span className="tag-chip">{track.tag}</span>}
              </div>
              {track.description && (
                <p className="text-sm text-muted">{track.description}</p>
              )}
              <p className="mt-1 font-mono text-xs text-muted">
                {track.lessonCount} {track.lessonCount === 1 ? "lesson" : "lessons"}
              </p>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-14">
        <h2 className="text-xl font-semibold">More resources</h2>
        <p className="mt-1 text-muted">
          Repos worth a look that live as code or PDFs rather than lessons — open
          them on GitHub.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {referenceRepos.map((repo) => (
            <a
              key={repo.href}
              href={repo.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card flex flex-col gap-2 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-fg">{repo.title}</h3>
                <span className="tag-chip">{repo.tag}</span>
              </div>
              <p className="text-sm text-muted">{repo.description}</p>
              <p className="mt-1 font-mono text-xs text-accent">View on GitHub &rarr;</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
