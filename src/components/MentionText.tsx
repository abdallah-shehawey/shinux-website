import Link from "next/link";
import { splitMentions } from "@/lib/mentions";

/**
 * Plain (non-Markdown) text with its @mentions turned into profile links —
 * the reply bodies. Markdown bodies get the same treatment inside the render
 * pipeline instead (remarkMentions in src/lib/markdown.ts).
 *
 * `knownHandles` is the thread's resolved mention list: an @handle that is not
 * in it stays literal text.
 */
export default function MentionText({
  text,
  knownHandles,
}: {
  text: string;
  knownHandles: string[];
}) {
  const segments = splitMentions(text, knownHandles);

  return (
    <>
      {segments.map((segment, i) =>
        segment.type === "mention" ? (
          <Link key={i} href={`/u/${segment.handle}`} prefetch={false} className="mention">
            @{segment.handle}
          </Link>
        ) : (
          <span key={i}>{segment.value}</span>
        ),
      )}
    </>
  );
}
