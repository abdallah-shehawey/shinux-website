import Link from "next/link";
import type { TrackMeta } from "@/lib/tutorials";
import type { Author } from "@/lib/site";
import AuthorInline from "./AuthorInline";
import { FaGithub } from "react-icons/fa";

// Extracted from /tutorials so the admin reorder view can render the exact same
// card it drags (see TutorialReorderGrid), the way ArticleCard/QuestionCard do.
export default function TrackCard({
  track,
  authors,
}: {
  track: TrackMeta;
  authors: Record<string, Author>;
}) {
  return (
    <div className="card active:scale-[0.98] active:opacity-90 group relative flex h-full min-w-0 flex-col gap-2 overflow-hidden transition-all duration-150 hover:border-accent">
      <Link
        href={`/tutorials/${track.slug}`}
        className="absolute inset-0 z-0"
        aria-label={track.title}
      />
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-fg group-hover:text-accent transition-colors">{track.title}</h2>
        {track.tag && <span className="tag-chip">{track.tag}</span>}
      </div>
      {track.description ? (
        <div className="flex-grow flex-1 min-h-0">
          <p className="line-clamp-3 text-sm text-muted">{track.description}</p>
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <p className="mt-1 font-mono text-xs text-muted">
        {track.lessonCount} {track.lessonCount === 1 ? "lesson" : "lessons"}
      </p>
      {track.authors.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {track.authors.map((username) => (
              <AuthorInline
                key={username}
                name={authors[username]?.name ?? username}
                username={username}
                avatar={authors[username]?.avatar}
              />
            ))}
          </div>
          {track.githubUrl && (
            <a
              href={track.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 flex items-center gap-1.5 p-1 hover:text-accent transition-colors duration-200"
              title="View on GitHub"
            >
              <FaGithub className="h-4 w-4" />
              <span>View on GitHub</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
