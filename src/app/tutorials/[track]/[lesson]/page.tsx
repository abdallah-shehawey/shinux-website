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
import { getAuthorProfile, unresolvedAuthor } from "@/lib/authors";
import { siteAuthor, ogCard } from "@/lib/site";
import TutorialReader from "@/components/TutorialReader";
import AuthorCard from "@/components/AuthorCard";

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
      images: [ogCard],
    },
    twitter: {
      title: found.title,
      description: found.description,
      images: [ogCard],
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
      className={`card active:scale-[0.98] active:opacity-90 transition-colors hover:border-accent ${align === "end" ? "sm:text-end" : ""}`}
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

  const trackData = getTrack(track);
  const { html, toc } = await renderMarkdown(found.body);
  const { prev, next } = getAdjacentLessons(track, lesson);
  // A lesson with an `author` keeps that byline even if they have no profile
  // row yet; only an author-less lesson falls back to the site owner.
  const author = found.author
    ? ((await getAuthorProfile(found.author)) ?? unresolvedAuthor(found.author))
    : siteAuthor;

  return (
    <>
      <div className="sticky top-14 z-10 bg-bg">
        <div className="mx-auto flex h-11 w-full items-center px-4 sm:px-8 lg:px-12">
          <Link
            href={`/tutorials/${track}`}
            prefetch={true}
            scroll={false}
            className="text-sm text-muted hover:text-accent transition-colors"
          >
            &larr; {trackData?.meta.title ?? "Back to track"}
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full px-4 pt-4 pb-12 sm:px-8 lg:px-12">
        <TutorialReader
          title={found.title}
          tags={found.tags}
          readingMinutes={found.readingMinutes}
          html={html}
          toc={toc}
          track={track}
          lessons={trackData?.lessons ?? []}
          currentSlug={lesson}
        >
          <div className="mt-10">
            <AuthorCard author={author} label="Written by" />
          </div>

          {(prev || next) && (
            <nav className="mt-8 grid gap-3 sm:grid-cols-2">
              {prev && <AdjacentCard track={track} lesson={prev} label="Previous" align="start" />}
              {next && <AdjacentCard track={track} lesson={next} label="Next" align="end" />}
            </nav>
          )}
        </TutorialReader>
      </div>
    </>
  );
}
