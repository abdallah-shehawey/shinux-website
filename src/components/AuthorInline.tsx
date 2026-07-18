import Link from "next/link";

// A small avatar + name unit, linking to /u/[username] when a username is
// known (never for an anonymous question's author — username is null there).
export default function AuthorInline({
  name,
  username,
  avatar,
  className = "",
}: {
  name: string;
  username?: string | null;
  avatar?: string | null;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase();
  const content = (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-mono text-[10px] font-bold text-accent-fg">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <span>{name}</span>
    </span>
  );

  return username ? (
    <Link href={`/u/${username}`} className="relative z-10 hover:text-accent">
      {content}
    </Link>
  ) : (
    content
  );
}
