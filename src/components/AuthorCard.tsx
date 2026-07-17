import type { Author } from "@/lib/site";

// Generic author card: takes an Author as props rather than assuming a single
// hard-coded writer, so it keeps working if the site grows multiple authors
// later (spec §12).
export default function AuthorCard({
  author,
  label,
}: {
  author: Author;
  label: string;
}) {
  const initial = author.name.trim().charAt(0).toUpperCase();

  return (
    <div className="card flex items-center gap-3">
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
    </div>
  );
}
