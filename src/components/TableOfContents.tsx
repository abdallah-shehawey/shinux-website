import type { TocItem } from "@/lib/markdown";

// Generic table-of-contents renderer — takes plain TocItem[] as props, no
// coupling to how the Markdown was sourced (spec §12: reusable pieces).
export default function TableOfContents({
  items,
  title,
}: {
  items: TocItem[];
  title: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={title} className="card">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} style={item.depth === 3 ? { paddingInlineStart: "1rem" } : undefined}>
            <a
              href={`#${item.id}`}
              className="text-muted transition-colors hover:text-accent"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
