import Link from "next/link";

// The one avatar in the Q&A thread. Three sizes, matching the three levels the
// thread has: a question's asker, an answer's author, a reply's author. An
// anonymous asker has no username, so their avatar is deliberately not a link.

const SIZES = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
} as const;

export type AvatarSize = keyof typeof SIZES;

export default function Avatar({
  name,
  avatar,
  username,
  size = "md",
  className = "",
}: {
  name: string;
  avatar?: string | null;
  username?: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const circle = (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-mono font-bold text-accent-fg ${SIZES[size]} ${className}`}
      aria-hidden={username ? undefined : true}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );

  if (!username) return circle;

  return (
    <Link
      href={`/u/${username}`}
      prefetch={false}
      aria-label={name}
      className="shrink-0 rounded-full transition duration-150 hover:brightness-110 active:scale-95"
    >
      {circle}
    </Link>
  );
}
