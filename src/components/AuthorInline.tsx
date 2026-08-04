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
    // Its own press indicator: a pill that highlights and shrinks around the
    // name alone. The card underneath no longer reacts (see .card-hit in
    // globals.css), so a tap here reads as "opening this person", not the card.
    // The negative margins cancel the pill's padding, keeping the avatar and
    // the row it sits in exactly where they were.
    <Link
      href={`/u/${username}`}
      prefetch={false}
      className="relative z-10 -mx-1 -my-0.5 inline-flex rounded-full px-1 py-0.5 transition duration-150 hover:bg-accent/10 hover:text-accent active:scale-95 active:bg-accent/20 active:text-accent"
    >
      {content}
    </Link>
  ) : (
    content
  );
}
