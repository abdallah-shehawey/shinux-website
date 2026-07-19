import type { TocItem } from "@/lib/markdown";

// Generic table-of-contents renderer — takes plain TocItem[] as props, no
// coupling to how the Markdown was sourced (spec §12: reusable pieces).
// `dir`/`lang` apply only to the heading list, since those items come from
// the article's own content language while the "On this page" label stays
// in the site's (English) UI language.
export default function TableOfContents({
  items,
  title,
  dir = "ltr",
  lang = "en",
}: {
  items: TocItem[];
  title: string;
  dir?: "ltr" | "rtl";
  lang?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={title} className="card">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <ul className="space-y-2 text-sm" dir={dir} lang={lang}>
        {items.map((item) => (
          <li key={item.id} style={item.depth === 3 ? { paddingInlineStart: "1rem" } : undefined}>
            <a
              href={`#${item.id}`}
              className="text-muted transition hover:text-accent active:opacity-60"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
