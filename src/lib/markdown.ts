import { createHash } from "node:crypto";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString as hastToString } from "hast-util-to-string";
import type { Root, Element } from "hast";

// ------------------------------------------------------------------------------
// Reusable Markdown → sanitized HTML pipeline.
//
// Deliberately standalone and content-source agnostic: it takes a Markdown
// STRING and returns an HTML string + a table of contents. It works the same
// for Markdown read from files (articles) or from the database later (user
// questions/answers) — see spec §12. Pass `sanitize: true` for untrusted input.
// ------------------------------------------------------------------------------

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface RenderedMarkdown {
  html: string;
  toc: TocItem[];
}

export interface RenderOptions {
  // Sanitize the HTML (strip raw HTML, scripts, iframes, …). Default: true.
  // Keep it ON for anything a user can submit.
  sanitize?: boolean;
}

// Sanitize schema based on the GitHub-safe default, extended just enough to keep
// heading ids (for anchors/TOC) and code language classes (for Shiki).
const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "className"],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./] as [string, RegExp],
    ],
    // Admonition classes set by rehypeAdmonitions() above.
    blockquote: [
      ...(defaultSchema.attributes?.blockquote ?? []),
      ["className", /^admonition(-\w+)?$/] as [string, RegExp],
    ],
    p: [...(defaultSchema.attributes?.p ?? []), ["className", "admonition-title"] as [string, string]],
  },
};

// Every text block decides its own direction from its own first strong
// character (dir="auto"), so Arabic and English paragraphs coexist in one body
// — an English line inside an Arabic question renders LTR and vice versa.
//
// Only LEAF text blocks get the attribute. Containers (ul/ol/blockquote/table)
// inherit from the page: HTML's dir="auto" resolution SKIPS descendants that
// carry their own dir attribute, so stamping a container whose children are
// all dir="auto" would wrongly resolve it to LTR. For the same reason a <p>
// directly inside an <li> (loose lists) is skipped — the <li> already carries
// the attribute and must keep seeing its text. <pre> is deliberately absent:
// code blocks are forced LTR in globals.css (spec §5). Runs AFTER
// rehype-sanitize so the attribute isn't stripped.
const BIDI_BLOCKS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th"]);

function rehypeBidiAuto() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, _index, parent) => {
      if (!BIDI_BLOCKS.has(node.tagName)) return;
      const parentTag = parent && parent.type === "element" ? parent.tagName : null;
      if (parentTag === "li") return;
      node.properties = { ...node.properties, dir: "auto" };
    });
  };
}

// Admonitions: a blockquote whose first line is a bolded label (`> **Note:**`,
// `> **Warning:** …`) becomes a styled callout instead of a plain quote. This
// is detected on the rendered tree rather than a new Markdown syntax, so it
// applies retroactively to every `> **Label:**` blockquote already written
// across the site's content — no markdown changes, no content migration.
const ADMONITION_LABELS: Record<string, { type: string; label: string }> = {
  note: { type: "note", label: "Note" },
  notes: { type: "note", label: "Note" },
  tip: { type: "tip", label: "Tip" },
  tips: { type: "tip", label: "Tip" },
  warning: { type: "warning", label: "Warning" },
  warnings: { type: "warning", label: "Warning" },
  important: { type: "important", label: "Important" },
  danger: { type: "danger", label: "Danger" },
  caution: { type: "danger", label: "Caution" },
};

function firstElementChild(node: Element): Element | null {
  return (node.children.find((c) => c.type === "element") as Element | undefined) ?? null;
}

function rehypeAdmonitions() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "blockquote") return;
      const firstPara = firstElementChild(node);
      if (!firstPara || firstPara.tagName !== "p") return;
      const firstInline = firstElementChild(firstPara);
      if (!firstInline || firstInline.tagName !== "strong") return;

      const rawLabel = hastToString(firstInline).replace(/:\s*$/, "").trim().toLowerCase();
      const match = ADMONITION_LABELS[rawLabel];
      if (!match) return;

      // Drop the bold label from its paragraph, trimming any leftover ": ".
      const rest = firstPara.children.filter((c) => c !== firstInline);
      const [head, ...tail] = rest;
      if (head?.type === "text") head.value = head.value.replace(/^[:\s]+/, "");
      firstPara.children = [head, ...tail].filter(
        (c) => c && !(c.type === "text" && c.value === ""),
      ) as typeof firstPara.children;

      // If removing the label leaves its paragraph empty, drop that paragraph
      // entirely — the label becomes the callout's own title instead.
      const body =
        firstPara.children.length === 0
          ? node.children.filter((c) => c !== firstPara)
          : node.children;

      const title: Element = {
        type: "element",
        tagName: "p",
        properties: { className: ["admonition-title"] },
        children: [{ type: "text", value: match.label }],
      };

      node.properties = {
        ...node.properties,
        className: ["admonition", `admonition-${match.type}`],
      };
      node.children = [title, ...body];
    });
  };
}

// Collect h2/h3 headings (after slugs are assigned) into a table of contents.
function rehypeCollectToc(toc: TocItem[]) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (
        (node.tagName === "h2" || node.tagName === "h3") &&
        typeof node.properties?.id === "string"
      ) {
        toc.push({
          id: node.properties.id,
          text: hastToString(node),
          depth: node.tagName === "h2" ? 2 : 3,
        });
      }
    });
  };
}

// Rendered-output cache keyed by content hash: a given Markdown source is
// compiled at most once per server process (Shiki tokenization dominates the
// cost, and the question page renders the question + EVERY answer on each
// visit). The in-flight promise is stored, so concurrent renders of the same
// source share one compilation. Bounded FIFO eviction keeps memory flat.
const RENDER_CACHE_MAX = 500;
const renderCache = new Map<string, Promise<RenderedMarkdown>>();

export function renderMarkdown(
  source: string,
  options: RenderOptions = {},
): Promise<RenderedMarkdown> {
  const { sanitize = true } = options;
  const key = `${sanitize ? "s" : "r"}:${createHash("sha1").update(source).digest("base64")}`;

  const hit = renderCache.get(key);
  if (hit) return hit;

  const pending = renderMarkdownUncached(source, sanitize).catch((err) => {
    renderCache.delete(key); // never cache a failed compile
    throw err;
  });
  if (renderCache.size >= RENDER_CACHE_MAX) {
    const oldest = renderCache.keys().next().value;
    if (oldest !== undefined) renderCache.delete(oldest);
  }
  renderCache.set(key, pending);
  return pending;
}

async function renderMarkdownUncached(
  source: string,
  sanitize: boolean,
): Promise<RenderedMarkdown> {
  const toc: TocItem[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    // allowDangerousHtml stays false → raw HTML embedded in Markdown is dropped.
    .use(remarkRehype)
    // Runs before sanitize so the schema below can allow-list its classes.
    .use(rehypeAdmonitions);

  // Sanitize BEFORE highlighting so Shiki's own (trusted) inline styles survive.
  if (sanitize) {
    processor.use(rehypeSanitize, sanitizeSchema);
  }

  processor
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: { className: ["heading-anchor"] },
    })
    .use(rehypeCollectToc, toc)
    .use(rehypeBidiAuto)
    // Dual theme: emits --shiki-light / --shiki-dark CSS variables so the code
    // block follows the site's light/dark toggle. See globals.css.
    .use(rehypeShiki, {
      themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
      defaultColor: false,
    })
    .use(rehypeStringify);

  const file = await processor.process(source);
  return { html: String(file), toc };
}
