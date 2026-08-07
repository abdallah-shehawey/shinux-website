// Relative timestamps for the Q&A thread, in the shape social feeds use: a
// bare unit while the post is recent ("5m", "3h", "2d"), then a calendar date
// once "N weeks ago" stops meaning anything. The exact time always survives in
// the element's `title`, so nothing is actually lost by shortening it.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "Just now" | "5m" | "3h" | "2d" | "5w" | "12 Mar" | "12 Mar 2024" */
export function relativeTime(iso: string): string {
  const then = new Date(iso);
  const diff = Date.now() - then.getTime();

  // A clock skew between the browser and the database must never render as a
  // negative age ("-1m") — anything in the future reads as brand new.
  if (diff < MINUTE) return "Just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
  if (diff < 5 * WEEK) return `${Math.floor(diff / WEEK)}w`;

  const sameYear = then.getFullYear() === new Date().getFullYear();
  return then.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** The full date + time, for the `title` tooltip behind a relative stamp. */
export function fullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
