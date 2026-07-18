import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getLesson,
  getTrack,
  getAdjacentLessons,
  getAllLessonParams,
  type LessonMeta,
} from "@/lib/tutorials";
import { renderMarkdown } from "@/lib/markdown";
import TutorialReader from "@/components/TutorialReader";

export function generateStaticParams() {
  return getAllLessonParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ track: string; lesson: string }>;
}): Promise<Metadata> {
  const { track, lesson } = await params;
  const found = getLesson(track, lesson);
  if (!found) return {};
  return {
    title: found.title,
    description: found.description,
    openGraph: {
      title: found.title,
      description: found.description,
      type: "article",
      tags: found.tags,
    },
  };
}

function AdjacentCard({
  track,
  lesson,
  label,
  align,
}: {
  track: string;
  lesson: LessonMeta;
  label: string;
  align: "start" | "end";
}) {
  return (
    <Link
      href={`/tutorials/${track}/${lesson.slug}`}
      className={`card ${align === "end" ? "sm:text-end" : ""}`}
    >
      <p className="text-xs text-muted">
        {align === "end" ? <>{label} &rarr;</> : <>&larr; {label}</>}
      </p>
      <p className="mt-1 font-medium">{lesson.title}</p>
    </Link>
  );
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ track: string; lesson: string }>;
}) {
  const { track, lesson } = await params;

  const found = getLesson(track, lesson);
  if (!found) notFound();

  const trackMeta = getTrack(track)?.meta;
  const { html, toc } = await renderMarkdown(found.body);
  const { prev, next } = getAdjacentLessons(track, lesson);

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <Link
        href={`/tutorials/${track}`}
        className="text-sm text-muted hover:text-accent"
      >
        &larr; {trackMeta?.title ?? "Back to track"}
      </Link>

      <TutorialReader
        title={found.title}
        tags={found.tags}
        readingMinutes={found.readingMinutes}
        html={html}
        toc={toc}
      >
        {(prev || next) && (
          <nav className="mt-8 grid gap-3 sm:grid-cols-2">
            {prev && <AdjacentCard track={track} lesson={prev} label="Previous" align="start" />}
            {next && <AdjacentCard track={track} lesson={next} label="Next" align="end" />}
          </nav>
        )}
      </TutorialReader>
    </div>
  );
}
