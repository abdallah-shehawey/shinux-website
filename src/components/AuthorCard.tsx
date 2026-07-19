import Link from "next/link";
import type { Author } from "@/lib/site";

// Generic author card: takes an Author as props rather than assuming a single
// hard-coded writer, so it keeps working if the site grows multiple authors
// later (spec §12). Links to the author's public profile.
export default function AuthorCard({
  author,
  label,
}: {
  author: Author;
  label: string;
}) {
  const initial = author.name.trim().charAt(0).toUpperCase();

  return (
    <Link
      href={`/u/${author.username}`}
      className="card active:scale-[0.98] active:opacity-90 flex items-center gap-3 transition-colors hover:border-accent"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-lg font-bold text-accent-fg">
        {author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.avatar}
            alt={author.name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="font-semibold text-fg">{author.name}</p>
      </div>
    </Link>
  );
}
