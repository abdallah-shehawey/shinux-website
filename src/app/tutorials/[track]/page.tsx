import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTracks, getTrack } from "@/lib/tutorials";

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
      </header>

      <ol className="grid gap-4 md:grid-cols-2">
        {lessons.map((lesson, i) => (
          <li key={lesson.slug}>
            <Link
              href={`/tutorials/${track}/${lesson.slug}`}
              className="card flex items-start gap-4 transition-colors hover:border-accent"
            >
              <span className="mt-0.5 font-mono text-sm text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-medium text-fg">{lesson.title}</span>
                {lesson.description && (
                  <span className="text-sm text-muted">{lesson.description}</span>
                )}
                <span className="font-mono text-xs text-muted">
                  {lesson.readingMinutes} min read
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
